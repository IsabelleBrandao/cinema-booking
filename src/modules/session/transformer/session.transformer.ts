import { Injectable } from '@nestjs/common';
import { Session } from '../entities/session.entity';
import { Seat } from '../entities/seat.entity';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SeatResponseDto } from '../dto/seat-response.dto';

@Injectable()
export class SessionTransformer {
  toResponse(session: Session): SessionResponseDto {
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
      seats: session.seats ? this.toSeatResponseList(session.seats) : [],
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }

  toResponseList(sessions: Session[]): SessionResponseDto[] {
    return sessions.map((session) => this.toResponse(session));
  }

  toSeatResponse(seat: Seat): SeatResponseDto {
    return {
      id: seat.id,
      seatNumber: seat.seat_number,
      status: seat.status,
    };
  }

  toSeatResponseList(seats: Seat[]): SeatResponseDto[] {
    return seats.map((seat) => this.toSeatResponse(seat));
  }
}
