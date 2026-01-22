import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionTransformer } from './transformer/session.transformer';

describe('SessionController', () => {
  let controller: SessionController;
  let mockService: any;
  let mockTransformer: any;

  beforeEach(async () => {
    mockService = {
      createSession: jest.fn(),
      findAllSessions: jest.fn(),
      findSessionById: jest.fn(),
      getAvailableSeats: jest.fn(),
    };

    mockTransformer = {
      toResponse: jest.fn((data) => data),
      toResponseList: jest.fn((data) => data),
      toSeatResponseList: jest.fn((data) => data),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: mockService,
        },

        {
          provide: SessionTransformer,
          useValue: mockTransformer,
        },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
  });

  it('deve criar sessão', async () => {
    const dto = {
      movie_name: 'Test',
      room_name: 'Room 1',
      start_time: new Date(),
      end_time: new Date(),
      ticket_price: 25,
      total_seats: 20,
    };

    const mockSession = { id: 'test-id', ...dto };
    mockService.createSession.mockResolvedValue(mockSession);

    const result = await controller.create(dto);

    expect(mockService.createSession).toHaveBeenCalledWith(dto);
    expect(mockTransformer.toResponse).toHaveBeenCalledWith(mockSession);
    expect(result).toEqual(mockSession);
  });

  it('deve listar sessões', async () => {
    const mockSessions = [{ id: '1' }, { id: '2' }];
    mockService.findAllSessions.mockResolvedValue(mockSessions);

    const result = await controller.findAll();

    expect(mockService.findAllSessions).toHaveBeenCalled();
    expect(mockTransformer.toResponseList).toHaveBeenCalledWith(mockSessions);
    expect(result).toEqual(mockSessions);
  });

  it('deve buscar assentos disponíveis', async () => {
    const mockSeats = [{ id: 'seat-1', status: 'available' }];
    mockService.getAvailableSeats.mockResolvedValue(mockSeats);

    const result = await controller.getAvailableSeats('session-1');

    expect(mockService.getAvailableSeats).toHaveBeenCalledWith('session-1');
    expect(mockTransformer.toSeatResponseList).toHaveBeenCalledWith(mockSeats);
    expect(result).toEqual(mockSeats);
  });
});
