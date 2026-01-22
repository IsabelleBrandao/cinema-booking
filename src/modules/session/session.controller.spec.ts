import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

describe('SessionController', () => {
  let controller: SessionController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      createSession: jest.fn(),
      findAllSessions: jest.fn(),
      findSessionById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: mockService,
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

    mockService.createSession.mockResolvedValue({ id: 'test-id' });

    const result = await controller.create(dto);

    expect(result).toEqual({ id: 'test-id' });
    expect(mockService.createSession).toHaveBeenCalledWith(dto);
  });
});