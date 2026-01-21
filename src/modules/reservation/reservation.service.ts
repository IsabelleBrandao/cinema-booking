import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, QueryFailedError } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Sale } from './entities/sale.entity';
import { Seat, SeatStatus } from '../session/entities/seat.entity';
import { Session } from '../session/entities/session.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CacheService } from '../cache/cache.service';
import { KafkaProducerService } from '../messaging/producers/kafka.producer';
import { KAFKA_TOPICS } from '../../config/kafka.config';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly reservationExpirationTime: number;

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly cacheService: CacheService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.reservationExpirationTime = this.configService.get<number>(
      'RESERVATION_EXPIRATION_TIME',
      30000, // 30 segundos padrão
    );
  }

  async createReservation(dto: CreateReservationDto): Promise<Reservation[]> {
    this.logger.log(`Iniciando reserva: ${dto.idempotency_key}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // READ COMMITTED é o ideal para evitar Deadlocks quando usamos Pessimistic Write
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // 1. Validar se a Sessão existe
      const session = await queryRunner.manager.findOne(Session, {
        where: { id: dto.session_id },
      });

      if (!session) {
        throw new NotFoundException('Sessão não encontrada');
      }

      const reservations: Reservation[] = [];
      const expiresAt = new Date(Date.now() + this.reservationExpirationTime);

      // 2. Loop para reservar cada assento
      for (const seatNumber of dto.seat_numbers) {
        // --- LOCK PESSIMISTA (O Coração da Concorrência) ---
        // "Trava" a linha do assento no banco. Ninguém mais lê ou escreve até o commit.
        const seat = await queryRunner.manager
          .createQueryBuilder(Seat, 'seat')
          .setLock('pessimistic_write')
          .where('seat.session_id = :sessionId', { sessionId: dto.session_id })
          .andWhere('seat.seat_number = :seatNumber', { seatNumber })
          .getOne();

        if (!seat) {
          throw new NotFoundException(`Assento ${seatNumber} não existe nesta sessão.`);
        }

        if (seat.status !== SeatStatus.AVAILABLE) {
          throw new ConflictException(`O assento ${seatNumber} já está reservado/vendido.`);
        }

        // Atualiza status do assento
        seat.status = SeatStatus.RESERVED;
        await queryRunner.manager.save(seat);

        // Cria a reserva
        const reservation = this.reservationRepository.create({
          user_id: dto.user_id,
          session_id: dto.session_id,
          seat_id: seat.id,
          status: ReservationStatus.PENDING,
          expires_at: expiresAt,
          // Chave composta para garantir Idempotência no nível do Banco
          idempotency_key: `${dto.idempotency_key}-${seatNumber}`,
        });

        const savedReservation = await queryRunner.manager.save(reservation);
        reservations.push(savedReservation);
      }

      // 3. Atualizar contador de assentos disponíveis da sessão
      await queryRunner.manager.decrement(
        Session,
        { id: dto.session_id },
        'available_seats',
        reservations.length,
      );

      // 4. Efetiva a transação
      await queryRunner.commitTransaction();

      // --- Pós-Commit (Efeitos Colaterais) ---
      
      // Enviar eventos Kafka
      for (const reservation of reservations) {
        await this.kafkaProducer.produce(KAFKA_TOPICS.RESERVATION_CREATED, {
          reservation_id: reservation.id,
          user_id: reservation.user_id,
          session_id: reservation.session_id,
          seat_id: reservation.seat_id,
          expires_at: reservation.expires_at,
        });
      }

      // Invalidar cache da sessão
      await this.cacheService.delPattern(`*${dto.session_id}*`);

      this.logger.log(
        `${reservations.length} reserva(s) criada(s). Expiram em ${this.reservationExpirationTime}ms`,
      );

      return reservations;
    } catch (error) {
      // Se der erro, desfaz tudo
      await queryRunner.rollbackTransaction();
      
      // Tratamento de Idempotência (Erro de Unique Constraint do Postgres)
      if (error.code === '23505') { 
        this.logger.warn(`Requisição duplicada ignorada: ${dto.idempotency_key}`);
        throw new ConflictException('Esta reserva já foi processada anteriormente.');
      }

      this.logger.error('Erro ao processar reserva', error);
      
      // Repassa erros conhecidos, caso contrário lança BadRequest
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro interno ao processar reserva.');
    } finally {
      await queryRunner.release();
    }
  }

  async confirmPayment(dto: ConfirmPaymentDto): Promise<Sale> {
    this.logger.log(`Confirmando pagamento: ${dto.reservation_id}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Busca a reserva com lock para garantir que não expire durante o pagamento
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: dto.reservation_id },
        relations: ['session', 'seat'],
        lock: { mode: 'pessimistic_write' }, // Garante exclusividade
      });

      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada');
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(`Reserva não está pendente (Status: ${reservation.status})`);
      }

      if (new Date() > reservation.expires_at) {
        throw new BadRequestException('Tempo de reserva expirado');
      }

      // Atualiza status da reserva
      reservation.status = ReservationStatus.CONFIRMED;
      await queryRunner.manager.save(reservation);

      // Atualiza status do assento para VENDIDO
      const seat = await queryRunner.manager.findOne(Seat, { where: { id: reservation.seat_id } });
      if (seat) {
        seat.status = SeatStatus.SOLD;
        await queryRunner.manager.save(seat);
      }

      // Gera o registro de Venda
      const sale = this.saleRepository.create({
        user_id: reservation.user_id,
        session_id: reservation.session_id,
        seat_id: reservation.seat_id,
        reservation_id: reservation.id,
        price: reservation.session.ticket_price,
        payment_id: dto.payment_id,
      });

      const savedSale = await queryRunner.manager.save(sale);

      await queryRunner.commitTransaction();

      // Evento de Pagamento Confirmado
      await this.kafkaProducer.produce(KAFKA_TOPICS.PAYMENT_CONFIRMED, {
        sale_id: savedSale.id,
        reservation_id: reservation.id,
        price: savedSale.price,
      });

      await this.cacheService.delPattern(`*${reservation.session_id}*`);
      
      return savedSale;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao confirmar pagamento', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async expireReservations(): Promise<void> {
    // Método chamado pelo Job (Cron)
    const expiredReservations = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.PENDING,
        expires_at: LessThan(new Date()),
      },
      take: 50, // Processa em lotes para não travar o banco
    });

    if (expiredReservations.length === 0) return;

    this.logger.log(`Expirando ${expiredReservations.length} reservas...`);

    for (const reservation of expiredReservations) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Marca como expirada
        reservation.status = ReservationStatus.EXPIRED;
        await queryRunner.manager.save(reservation);

        // Libera o assento
        const seat = await queryRunner.manager.findOne(Seat, { where: { id: reservation.seat_id } });
        if (seat && seat.status === SeatStatus.RESERVED) {
          seat.status = SeatStatus.AVAILABLE;
          await queryRunner.manager.save(seat);
          
          // Devolve para o pool de disponíveis
          await queryRunner.manager.increment(Session, { id: reservation.session_id }, 'available_seats', 1);
        }

        await queryRunner.commitTransaction();

        // Notifica liberação
        await this.kafkaProducer.produce(KAFKA_TOPICS.SEAT_RELEASED, {
          reservation_id: reservation.id,
          seat_id: reservation.seat_id,
        });

      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Falha ao expirar reserva ${reservation.id}`, error);
      } finally {
        await queryRunner.release();
      }
    }
    
    // Limpa cache uma vez por lote, se necessário
    if (expiredReservations.length > 0) {
       // Opcional: invalidar caches específicos se soubermos os IDs das sessões
    }
  }

  async getUserPurchases(userId: string): Promise<Sale[]> {
    return this.saleRepository.find({
      where: { user_id: userId },
      relations: ['session', 'seat'],
      order: { created_at: 'DESC' },
    });
  }
}