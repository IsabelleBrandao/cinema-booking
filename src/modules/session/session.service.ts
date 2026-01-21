import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Session } from './entities/session.entity';
import { Seat, SeatStatus } from './entities/seat.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  async createSession(dto: CreateSessionDto): Promise<Session> {
    this.logger.log(
      `Criando nova sessão: ${dto.movie_name} - ${dto.room_name}`,
    );

    // INICIO DA TRANSAÇÃO
    // Garante Atomicidade: Ou cria tudo (sessão + assentos) ou não cria nada.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validação de Lógica de Negócio
      // Como usamos @Type(() => Date) no DTO, as datas já chegam como objetos Date aqui
      if (dto.end_time <= dto.start_time) {
        throw new BadRequestException(
          'A data de término deve ser posterior ao início.',
        );
      }

      // 2. Criar a Sessão na memória (ainda não salva)
      const session = this.sessionRepository.create({
        ...dto, // Espalha as propriedades do DTO (movie_name, price, etc)
        available_seats: dto.total_seats, // Começa cheia
        is_active: true,
      });

      // Salva a sessão dentro da transação
      const savedSession = await queryRunner.manager.save(session);

      // 3. Gerar Assentos Automaticamente
      // Lógica: Criar filas de 10 cadeiras (A1...A10, B1...B10)
      const seats: Seat[] = [];
      const seatsPerRow = 10;
      const rows = Math.ceil(dto.total_seats / seatsPerRow);

      let seatCount = 0;
      for (let row = 0; row < rows; row++) {
        const rowLetter = String.fromCharCode(65 + row); // Converte 0->A, 1->B...

        // Na última fila, pode sobrar menos cadeiras
        const seatsInCurrentRow = Math.min(
          seatsPerRow,
          dto.total_seats - seatCount,
        );

        for (let col = 1; col <= seatsInCurrentRow; col++) {
          const seat = this.seatRepository.create({
            session_id: savedSession.id,
            seat_number: `${rowLetter}${col}`, // Ex: A1, B5
            status: SeatStatus.AVAILABLE,
          });
          seats.push(seat);
          seatCount++;
        }
      }

      // Salva todos os assentos de uma vez (Bulk Insert)
      await queryRunner.manager.save(seats);

      // Confirma a transação no banco
      await queryRunner.commitTransaction();

      this.logger.log(
        `Sessão ${savedSession.id} criada com ${seats.length} assentos.`,
      );

      return savedSession;
    } catch (error) {
      // Se deu erro, desfaz tudo
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao criar sessão', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findSessionById(sessionId: string): Promise<Session> {
    const cacheKey = `session:${sessionId}`;

    // 1. Tenta pegar do Cache (Redis)
    const cachedSession = await this.cacheService.get<Session>(cacheKey);
    if (cachedSession) {
      return cachedSession;
    }

    // 2. Busca no Banco de Dados
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      // Não trazemos os 'seats' aqui para economizar memória na listagem simples
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // 3. Salva no Cache por 5 minutos
    await this.cacheService.set(cacheKey, session, 300);

    return session;
  }

  async findAllSessions(): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { is_active: true },
      order: { start_time: 'ASC' },
    });
  }

  async getAvailableSeats(sessionId: string): Promise<Seat[]> {
    // Cache de curta duração (5s) para aguentar refresh frenético dos usuários
    const cacheKey = `session:seats:${sessionId}`;
    
    const cachedSeats = await this.cacheService.get<Seat[]>(cacheKey);
    if (cachedSeats) {
      return cachedSeats;
    }

    // Garante que a sessão existe
    await this.findSessionById(sessionId);

    const seats = await this.seatRepository.find({
      where: {
        session_id: sessionId,
        status: SeatStatus.AVAILABLE,
      },
      order: {
        seat_number: 'ASC', // A1, A2, B1...
      },
    });

    await this.cacheService.set(cacheKey, seats, 5);

    return seats;
  }
}