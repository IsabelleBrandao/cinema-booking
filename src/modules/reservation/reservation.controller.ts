import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { Reservation } from './entities/reservation.entity';
import { Sale } from './entities/sale.entity';

@ApiTags('Reservas')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova reserva de assento(s)' })
  @ApiResponse({
    status: 201,
    description: 'Reserva criada com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Assento não disponível',
  })
  async createReservation(
    @Body() dto: CreateReservationDto,
  ): Promise<{
    mensagem: string;
    reservas: Reservation[];
    expira_em: string;
  }> {
    const reservations = await this.reservationService.createReservation(dto);

    return {
      mensagem: 'Reserva criada com sucesso',
      reservas: reservations,
      expira_em: reservations[0].expires_at.toISOString(),
    };
  }

  @Post('confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar pagamento de reserva' })
  @ApiResponse({
    status: 200,
    description: 'Pagamento confirmado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Reserva expirada ou inválida',
  })
  async confirmPayment(
    @Body() dto: ConfirmPaymentDto,
  ): Promise<{ mensagem: string; venda: Sale }> {
    const sale = await this.reservationService.confirmPayment(dto);

    return {
      mensagem: 'Pagamento confirmado com sucesso',
      venda: sale,
    };
  }

  @Get('user/:userId/purchases')
  @ApiOperation({ summary: 'Buscar histórico de compras do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Histórico de compras retornado com sucesso',
  })
  async getUserPurchases(@Param('userId') userId: string): Promise<Sale[]> {
    return this.reservationService.getUserPurchases(userId);
  }
}