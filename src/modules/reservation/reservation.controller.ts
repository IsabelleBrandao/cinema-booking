import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

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

  @Get('user/:userId/purchases')
  @ApiOperation({ 
    summary: 'Histórico de compras do usuário',
    description: 'Retorna todas as vendas confirmadas de um usuário, ordenadas por data.' 
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de compras',
    schema: {
      example: [
        {
          id: 'sale-uuid',
          sessionId: 'session-uuid',
          movieName: 'Vingadores',
          seatNumber: 'A1',
          price: 25.00,
          purchaseDate: '2026-01-20T19:00:00Z'
        }
      ]
    }
  })
  async getUserPurchases(@Param('userId') userId: string) {
    return this.reservationService.getUserPurchases(userId);
  }
}