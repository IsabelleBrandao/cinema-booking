import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { ReservationTransformer } from './transformer/reservation.transformer';
import { ReservationResponseDto } from './dto/reservation-response.dto';

@ApiTags('Reservas')
@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly transformer: ReservationTransformer,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reservar assentos',
    description:
      'Bloqueia os assentos temporariamente (30s). Exige confirmação de pagamento posterior.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva iniciada com sucesso. Aguardando pagamento.',
    type: [ReservationResponseDto],
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito: Um ou mais assentos já estão ocupados.',
  })
  async createReservation(@Body() dto: CreateReservationDto) {
    const reservations = await this.reservationService.createReservation(dto);
    return this.transformer.toResponseList(reservations);
  }

  @Post('confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar pagamento e finalizar venda' })
  @ApiResponse({
    status: 200,
    description: 'Venda confirmada e ingresso gerado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva não encontrada ou expirada.',
  })
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    const sale = await this.reservationService.confirmPayment(dto);
    return this.transformer.toSaleResponse(sale);
  }

  @Get('user/:userId/purchases')
  @ApiOperation({
    summary: 'Histórico de compras do usuário',
    description: 'Retorna todas as vendas confirmadas de um usuário.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de compras recuperada com sucesso.',
  })
  async getUserPurchases(@Param('userId') userId: string) {
    return this.reservationService.getUserPurchases(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar uma reserva pendente manualmente' })
  @ApiResponse({
    status: 204,
    description: 'Reserva cancelada e assento liberado.',
  })
  async cancel(@Param('id') id: string) {
    await this.reservationService.cancelReservation(id);
  }
}
