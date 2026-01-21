import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
// Importe a entidade Reservation se quiser usar no type, ou crie um ResponseDTO
import { Reservation } from './entities/reservation.entity'; 

@ApiTags('Reservas')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Reservar assentos',
    description: 'Bloqueia os assentos temporariamente. Exige confirmação de pagamento.' 
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva iniciada. Aguardando pagamento.',
    schema: {
      example: {
        mensagem: 'Reserva criada com sucesso',
        reservas: [{ id: '...', status: 'pending' }],
        expira_em: '2026-02-20T19:15:00Z'
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito: Assento já ocupado.',
    schema: { example: { statusCode: 409, message: 'Assento A1 indisponível' } }
  })
  createReservation(@Body() dto: CreateReservationDto) {
    return this.reservationService.createReservation(dto);
  }

  @Post('confirm-payment')
  @ApiOperation({ summary: 'Confirmar pagamento e finalizar venda' })
  @ApiResponse({ status: 200, description: 'Venda confirmada' })
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.reservationService.confirmPayment(dto);
  }
}