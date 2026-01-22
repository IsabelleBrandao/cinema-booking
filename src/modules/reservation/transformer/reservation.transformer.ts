import { Injectable } from '@nestjs/common';
import { Reservation } from '../entities/reservation.entity';
import { Sale } from '../entities/sale.entity';
import { ReservationResponseDto } from '../dto/reservation-response.dto';

@Injectable()
export class ReservationTransformer {
  toResponse(reservation: Reservation): ReservationResponseDto {
    return {
      id: reservation.id,
      userId: reservation.user_id,
      sessionId: reservation.session_id,
      status: reservation.status,
      seatNumber: reservation.seat?.seat_number || 'N/A',
      expiresAt: reservation.expires_at,
      createdAt: reservation.created_at,
    };
  }

  toResponseList(reservations: Reservation[]): ReservationResponseDto[] {
    return reservations.map((r) => this.toResponse(r));
  }

  toSaleResponse(sale: Sale) {
    return {
      id: sale.id,
      status: 'COMPLETED',
      price: Number(sale.price),
      paymentId: sale.payment_id,
      ticketCode: sale.id.split('-')[0].toUpperCase(),
      purchasedAt: sale.created_at,
    };
  }
}
