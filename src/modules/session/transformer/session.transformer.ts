import { Injectable } from '@nestjs/common';
import { Session } from '../entities/session.entity';
import { Seat } from '../entities/seat.entity';

@Injectable()
export class SessionTransformer {
  toResponse(session: Session) {
    return {
      id: session.id,
      movieName: session.movie_name,
      roomName: session.room_name,
      startTime: session.start_time,
      endTime: session.end_time,
      ticketPrice: Number(session.ticket_price),
      totalSeats: session.total_seats,
      availableSeats: session.available_seats,
      isActive: session.is_active,
      // Agora chamamos o método público
      seats: session.seats ? session.seats.map((seat) => this.toSeatResponse(seat)) : [],
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }

  toResponseList(sessions: Session[]) {
    return sessions.map((session) => this.toResponse(session));
  }

  // MUDANÇA AQUI: Tornamos público para usar no endpoint de assentos
  toSeatResponse(seat: Seat) {
    return {
      id: seat.id,
      seatNumber: seat.seat_number,
      status: seat.status,
    };
  }

  // Novo método para transformar uma lista de assentos
  toSeatResponseList(seats: Seat[]) {
    return seats.map((seat) => this.toSeatResponse(seat));
  }
}