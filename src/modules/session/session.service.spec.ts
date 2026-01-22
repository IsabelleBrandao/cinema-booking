import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';
import { Seat, SeatStatus } from './entities/seat.entity';
import { CacheService } from '../cache/cache.service';
import { DataSource, QueryRunner } from 'typeorm';

describe('SessionService', () => {
  let service: SessionService;
  let mockSessionRepository: any;
  let mockSeatRepository: any;
  let mockCacheService: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    mockSessionRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockSeatRepository = {
      create: jest.fn(),
      find: jest.fn(),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: mockSeatRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  describe('createSession', () => {
    const validDto = {
      movie_name: 'Test Movie',
      room_name: 'Room 1',
      start_time: new Date('2026-02-01T19:00:00Z'),
      end_time: new Date('2026-02-01T21:00:00Z'),
      ticket_price: 25.0,
      total_seats: 20,
    };

    it('deve criar sessão com assentos corretamente', async () => {
      const mockSession = { id: 'session-uuid', ...validDto };
      mockSessionRepository.create.mockReturnValue(validDto);
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockSession);
      mockSeatRepository.create.mockImplementation((data) => data);
      mockQueryRunner.manager.save.mockResolvedValueOnce([]);

      const result = await service.createSession(validDto);

      expect(result).toEqual(mockSession);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('deve lançar erro se end_time <= start_time', async () => {
      const invalidDto = {
        ...validDto,
        end_time: new Date('2026-02-01T18:00:00Z'),
      };

      await expect(service.createSession(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve fazer rollback em caso de erro', async () => {
      mockSessionRepository.create.mockReturnValue(validDto);
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.createSession(validDto)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('findSessionById', () => {
    it('deve retornar sessão do cache', async () => {
      const mockSession = { id: 'test-id', movie_name: 'Test' };
      mockCacheService.get.mockResolvedValue(mockSession);

      const result = await service.findSessionById('test-id');

      expect(result).toEqual(mockSession);
      expect(mockCacheService.get).toHaveBeenCalledWith('session:test-id');
      expect(mockSessionRepository.findOne).not.toHaveBeenCalled();
    });

    it('deve buscar no BD e cachear', async () => {
      const mockSession = { id: 'test-id', movie_name: 'Test' };
      mockCacheService.get.mockResolvedValue(null);
      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      const result = await service.findSessionById('test-id');

      expect(result).toEqual(mockSession);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'session:test-id',
        mockSession,
        300,
      );
    });

    it('deve lançar NotFoundException se não encontrar', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.findSessionById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAvailableSeats', () => {
    it('deve retornar assentos do cache', async () => {
      const mockSeats = [{ id: '1', seat_number: 'A1' }];
      mockCacheService.get.mockResolvedValue(mockSeats);

      const result = await service.getAvailableSeats('session-id');

      expect(result).toEqual(mockSeats);
      expect(mockSeatRepository.find).not.toHaveBeenCalled();
    });

    it('deve buscar assentos disponíveis e cachear', async () => {
      const mockSeats = [
        { id: '1', seat_number: 'A1', status: SeatStatus.AVAILABLE },
      ];
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.get.mockResolvedValueOnce({ id: 'session-id' });
      mockSeatRepository.find.mockResolvedValue(mockSeats);

      const result = await service.getAvailableSeats('session-id');

      expect(result).toEqual(mockSeats);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });
});