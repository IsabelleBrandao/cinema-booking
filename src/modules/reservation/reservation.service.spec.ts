import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReservationService } from './reservation.service';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Sale } from './entities/sale.entity';
import { Seat, SeatStatus } from '../session/entities/seat.entity';
import { Session } from '../session/entities/session.entity';
import { CacheService } from '../cache/cache.service';
import { KafkaProducerService } from '../messaging/producers/kafka.producer';
import { DataSource } from 'typeorm';

describe('ReservationService', () => {
  let service: ReservationService;
  let mockQueryRunner: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        increment: jest.fn(),
        decrement: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn(),
        })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Sale),
          useValue: { create: jest.fn() },
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Session),
          useValue: {},
        },
        {
          provide: CacheService,
          useValue: {
            delPattern: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            produce: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 30000),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
  });

  describe('createReservation', () => {
    it('deve criar reserva com sucesso', async () => {
      const dto = {
        user_id: 'user-1',
        session_id: 'session-1',
        seat_numbers: ['A1'],
        idempotency_key: 'key-123',
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'session-1',
      });

      const mockSeat = {
        id: 'seat-1',
        status: SeatStatus.AVAILABLE,
        seat_number: 'A1',
      };

      mockQueryRunner.manager
        .createQueryBuilder()
        .getOne.mockResolvedValue(mockSeat);

      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'new-id' }),
      );

      const result = await service.createReservation(dto);

      expect(result).toHaveLength(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se sessão não existe', async () => {
      const dto = {
        user_id: 'user-1',
        session_id: 'invalid',
        seat_numbers: ['A1'],
        idempotency_key: 'key-123',
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.createReservation(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException se assento já reservado', async () => {
      const dto = {
        user_id: 'user-1',
        session_id: 'session-1',
        seat_numbers: ['A1'],
        idempotency_key: 'key-123',
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce({ id: 'session-1' });

      const mockSeat = {
        id: 'seat-1',
        status: SeatStatus.RESERVED,
        seat_number: 'A1',
      };

      mockQueryRunner.manager
        .createQueryBuilder()
        .getOne.mockResolvedValue(mockSeat);

      await expect(service.createReservation(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve tratar erro de idempotência (código 23505)', async () => {
      const dto = {
        user_id: 'user-1',
        session_id: 'session-1',
        seat_numbers: ['A1'],
        idempotency_key: 'duplicate-key',
      };

      const duplicateError = new Error('Duplicate') as any;
      duplicateError.code = '23505';

      mockQueryRunner.manager.findOne.mockResolvedValueOnce({ id: 'session-1' });
      mockQueryRunner.manager.save.mockRejectedValueOnce(duplicateError);

      await expect(service.createReservation(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('confirmPayment', () => {
    it('deve confirmar pagamento com sucesso', async () => {
      const dto = {
        reservation_id: 'res-1',
        payment_id: 'pay-123',
      };

      const mockReservation = {
        id: 'res-1',
        status: ReservationStatus.PENDING,
        expires_at: new Date(Date.now() + 60000),
        session: { ticket_price: 25.0 },
        user_id: 'user-1',
        session_id: 'session-1',
        seat_id: 'seat-1',
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockReservation)
        .mockResolvedValueOnce({ id: 'seat-1' });

      mockQueryRunner.manager.save.mockResolvedValue({});

      const result = await service.confirmPayment(dto);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('deve lançar erro se reserva não está pendente', async () => {
      const dto = { reservation_id: 'res-1' };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        status: ReservationStatus.CONFIRMED,
      });

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro se reserva expirou', async () => {
      const dto = { reservation_id: 'res-1' };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        status: ReservationStatus.PENDING,
        expires_at: new Date(Date.now() - 10000),
      });

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});