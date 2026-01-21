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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Criar sessão
      const session = this.sessionRepository.create({
        movie_name: dto.movie_name,
        room_name: dto.room_name,
        start_time: new Date(dto.start_time),
        end_time: new Date(dto.end_time),
        ticket_price: dto.ticket_price,
        total_seats: dto.total_seats,
        available_seats: dto.total_seats,
      });

      const savedSession = await queryRunner.manager.save(session);

      // Criar assentos
      const seats: Seat[] = [];
      const rows = Math.ceil(dto.total_seats / 4);

      let seatNumber = 0;
      for (let row = 0; row < rows; row++) {
        const rowLetter = String.fromCharCode(65 + row); // A, B, C...
        const seatsInRow = Math.min(4, dto.total_seats - seatNumber);

        for (let col = 1; col <= seatsInRow; col++) {
          const seat = this.seatRepository.create({
            session_id: savedSession.id,
            seat_number: `${rowLetter}${col}`,
            status: SeatStatus.AVAILABLE,
          });
          seats.push(seat);
          seatNumber++;
        }
      }

      await queryRunner.manager.save(seats);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Sessão criada com sucesso: ${savedSession.id} com ${seats.length} assentos`,
      );

      // Invalidar cache
      await this.cacheService.del(`session:${savedSession.id}`);

      return savedSession;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao criar sessão', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findSessionById(sessionId: string): Promise<Session> {
    // Tentar buscar do cache primeiro
    const cacheKey = `session:${sessionId}`;
    const cached = await this.cacheService.get<Session>(cacheKey);

    if (cached) {
      this.logger.debug(`Sessão ${sessionId} retornada do cache`);
      return cached;
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['seats'],
    });

    if (!session) {
      throw new NotFoundException(`Sessão ${sessionId} não encontrada`);
    }

    // Armazenar no cache
    await this.cacheService.set(cacheKey, session, 300);

    return session;
  }

  async getAvailableSeats(sessionId: string): Promise<Seat[]> {
    const cacheKey = `available-seats:${sessionId}`;
    const cached = await this.cacheService.get<Seat[]>(cacheKey);

    if (cached) {
      this.logger.debug(
        `Assentos disponíveis da sessão ${sessionId} retornados do cache`,
      );
      return cached;
    }

    const seats = await this.seatRepository.find({
      where: {
        session_id: sessionId,
        status: SeatStatus.AVAILABLE,
      },
      order: {
        seat_number: 'ASC',
      },
    });

    // Cache por 10 segundos
    await this.cacheService.set(cacheKey, seats, 10);

    return seats;
  }

  async findAllSessions(): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { is_active: true },
      order: { start_time: 'ASC' },
    });
  }
}