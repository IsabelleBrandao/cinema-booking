import { Test, TestingModule } from '@nestjs/testing';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { ReservationTransformer } from './transformer/reservation.transformer';

describe('ReservationController', () => {
  let controller: ReservationController;
  let mockService: any;
  let mockTransformer: any;

  beforeEach(async () => {
    mockService = {
      createReservation: jest.fn(),
      confirmPayment: jest.fn(),
      getUserPurchases: jest.fn(),
      cancelReservation: jest.fn(),
    };

    mockTransformer = {
      toResponseList: jest.fn((data) => data),
      toSaleResponse: jest.fn((data) => data),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: mockService,
        },
       
        {
          provide: ReservationTransformer,
          useValue: mockTransformer,
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

    const mockResponse = [{ id: 'res-1' }];
    mockService.createReservation.mockResolvedValue(mockResponse);

    const result = await controller.createReservation(dto);

    expect(mockService.createReservation).toHaveBeenCalledWith(dto);
    expect(mockTransformer.toResponseList).toHaveBeenCalledWith(mockResponse);
    expect(result).toEqual(mockResponse);
  });

  it('deve confirmar pagamento', async () => {
    const dto = {
      reservation_id: 'res-1',
      payment_id: 'pay-123',
    };

    const mockSale = { id: 'sale-1' };
    mockService.confirmPayment.mockResolvedValue(mockSale);

    const result = await controller.confirmPayment(dto);

    expect(mockService.confirmPayment).toHaveBeenCalledWith(dto);
    expect(mockTransformer.toSaleResponse).toHaveBeenCalledWith(mockSale);
    expect(result).toEqual(mockSale);
  });
});
