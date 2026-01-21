import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
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
      30000,
    );
  }

  async createReservation(
    dto: CreateReservationDto,
  ): Promise<Reservation[]> {
    this.logger.log(
      `Iniciando reserva para usuário ${dto.user_id} - Sessão ${dto.session_id}`,
    );

    // Verificar idempotência
    const existingReservation = await this.reservationRepository.findOne({
      where: {
        idempotency_key: dto.idempotency_key,
        status: ReservationStatus.PENDING,
      },
    });

    if (existingReservation) {
      this.logger.warn(`Requisição duplicada detectada: ${dto.idempotency_key}`);
      return [existingReservation];
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Verificar se sessão existe
      const session = await queryRunner.manager.findOne(Session, {
        where: { id: dto.session_id },
      });

      if (!session) {
        throw new NotFoundException('Sessão não encontrada');
      }

      const reservations: Reservation[] = [];
      const expiresAt = new Date(Date.now() + this.reservationExpirationTime);

      for (const seatNumber of dto.seat_numbers) {
        // Buscar e bloquear assento com SELECT FOR UPDATE
        const seat = await queryRunner.manager
          .createQueryBuilder(Seat, 'seat')
          .setLock('pessimistic_write')
          .where('seat.session_id = :sessionId', {
            sessionId: dto.session_id,
          })
          .andWhere('seat.seat_number = :seatNumber', { seatNumber })
          .andWhere('seat.status = :status', {
            status: SeatStatus.AVAILABLE,
          })
          .getOne();

        if (!seat) {
          throw new ConflictException(
            `Assento ${seatNumber} não está disponível`,
          );
        }

        // Atualizar status do assento
        seat.status = SeatStatus.RESERVED;
        seat.version += 1;
        await queryRunner.manager.save(seat);

        // Criar reserva
        const reservation = this.reservationRepository.create({
          user_id: dto.user_id,
          session_id: dto.session_id,
          seat_id: seat.id,
          status: ReservationStatus.PENDING,
          expires_at: expiresAt,
          idempotency_key: `${dto.idempotency_key}-${seatNumber}`,
        });

        const savedReservation = await queryRunner.manager.save(reservation);
        reservations.push(savedReservation);

        this.logger.log(
          `Assento ${seatNumber} reservado - Reserva ${savedReservation.id}`,
        );
      }

      // Atualizar contador de assentos disponíveis
      await queryRunner.manager.decrement(
        Session,
        { id: dto.session_id },
        'available_seats',
        dto.seat_numbers.length,
      );

      await queryRunner.commitTransaction();

      // Publicar evento
      for (const reservation of reservations) {
        await this.kafkaProducer.produce(KAFKA_TOPICS.RESERVATION_CREATED, {
          reservation_id: reservation.id,
          user_id: reservation.user_id,
          session_id: reservation.session_id,
          seat_id: reservation.seat_id,
          expires_at: reservation.expires_at,
        });
      }

      // Invalidar cache
      await this.cacheService.delPattern(`*${dto.session_id}*`);

      this.logger.log(
        `${reservations.length} reserva(s) criada(s) com sucesso. Expiram em ${this.reservationExpirationTime}ms`,
      );

      return reservations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao criar reserva', error);

      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Erro ao processar reserva');
    } finally {
      await queryRunner.release();
    }
  }

  async confirmPayment(dto: ConfirmPaymentDto): Promise<Sale> {
    this.logger.log(`Confirmando pagamento da reserva ${dto.reservation_id}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Buscar reserva
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: dto.reservation_id },
        relations: ['session', 'seat'],
      });

      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada');
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          `Reserva está no status ${reservation.status}`,
        );
      }

      // Verificar se expirou
      if (new Date() > reservation.expires_at) {
        throw new BadRequestException('Reserva expirada');
      }

      // Atualizar reserva
      reservation.status = ReservationStatus.CONFIRMED;
      await queryRunner.manager.save(reservation);

      // Atualizar assento
      const seat = await queryRunner.manager.findOne(Seat, {
        where: { id: reservation.seat_id },
      });

      seat.status = SeatStatus.SOLD;
      await queryRunner.manager.save(seat);

      // Criar venda
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

      // Publicar evento
      await this.kafkaProducer.produce(KAFKA_TOPICS.PAYMENT_CONFIRMED, {
        sale_id: savedSale.id,
        reservation_id: reservation.id,
        user_id: reservation.user_id,
        session_id: reservation.session_id,
        seat_id: reservation.seat_id,
        price: savedSale.price,
      });

      // Invalidar cache
      await this.cacheService.delPattern(`*${reservation.session_id}*`);

      this.logger.log(`Pagamento confirmado - Venda ${savedSale.id} criada`);

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
    this.logger.log('Verificando reservas expiradas');

    const expiredReservations = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.PENDING,
        expires_at: LessThan(new Date()),
      },
      relations: ['seat'],
    });

    if (expiredReservations.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const reservation of expiredReservations) {
        // Atualizar reserva
        reservation.status = ReservationStatus.EXPIRED;
        await queryRunner.manager.save(reservation);

        // Liberar assento
        const seat = await queryRunner.manager.findOne(Seat, {
          where: { id: reservation.seat_id },
        });

        if (seat && seat.status === SeatStatus.RESERVED) {
          seat.status = SeatStatus.AVAILABLE;
          await queryRunner.manager.save(seat);

          // Incrementar assentos disponíveis
          await queryRunner.manager.increment(
            Session,
            { id: reservation.session_id },
            'available_seats',
            1,
          );

          // Publicar evento
          await this.kafkaProducer.produce(KAFKA_TOPICS.SEAT_RELEASED, {
            reservation_id: reservation.id,
            session_id: reservation.session_id,
            seat_id: reservation.seat_id,
          });

          // Invalidar cache
          await this.cacheService.delPattern(`*${reservation.session_id}*`);
        }

        this.logger.log(`Reserva ${reservation.id} expirada e assento liberado`);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao expirar reservas', error);
    } finally {
      await queryRunner.release();
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