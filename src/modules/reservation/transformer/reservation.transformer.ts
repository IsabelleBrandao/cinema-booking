import { Injectable } from '@nestjs/common';
import { Reservation } from '../entities/reservation.entity';
import { Sale } from '../entities/sale.entity';

@Injectable()
export class ReservationTransformer {
  toResponse(reservation: Reservation) {
    return {
      id: reservation.id,
      userId: reservation.user_id,
      sessionId: reservation.session_id,
      status: reservation.status,
      seatNumber: reservation.seat?.seat_number, // Pega do relacionamento se existir
      expiresAt: reservation.expires_at,
      createdAt: reservation.created_at,
    };
  }

  toResponseList(reservations: Reservation[]) {
    return reservations.map(r => this.toResponse(r));
  }

  toSaleResponse(sale: Sale) {
    return {
      id: sale.id,
      status: 'COMPLETED',
      price: Number(sale.price),
      paymentId: sale.payment_id,
      ticketCode: sale.id.substring(0, 8).toUpperCase(), // Simulação de código
      purchasedAt: sale.created_at,
    };
  }
}