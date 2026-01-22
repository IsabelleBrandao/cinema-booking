import { Test, TestingModule } from '@nestjs/testing';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';

describe('ReservationController', () => {
  let controller: ReservationController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      createReservation: jest.fn(),
      confirmPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ReservationController>(ReservationController);
  });

  it('deve criar reserva', async () => {
    const dto = {
      user_id: 'user-1',
      session_id: 'session-1',
      seat_numbers: ['A1'],
      idempotency_key: 'key-123',
    };

    mockService.createReservation.mockResolvedValue([{ id: 'res-1' }]);

    const result = await controller.createReservation(dto);

    expect(mockService.createReservation).toHaveBeenCalledWith(dto);
  });
});