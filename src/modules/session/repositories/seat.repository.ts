import { Injectable } from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { Seat, SeatStatus } from '../entities/seat.entity';

@Injectable()
export class SeatRepository extends Repository<Seat> {
  constructor(private dataSource: DataSource) {
    super(Seat, dataSource.createEntityManager());
  }

  async findAvailableSeatsBySession(sessionId: string): Promise<Seat[]> {
    return this.createQueryBuilder('seat')
      .where('seat.session_id = :sessionId', { sessionId })
      .andWhere('seat.status = :status', { status: SeatStatus.AVAILABLE })
      .orderBy('seat.seat_number', 'ASC')
      .getMany();
  }

  async findSeatsByNumbers(
    sessionId: string,
    seatNumbers: string[],
  ): Promise<Seat[]> {
    return this.createQueryBuilder('seat')
      .where('seat.session_id = :sessionId', { sessionId })
      .andWhere('seat.seat_number IN (:...seatNumbers)', { seatNumbers })
      .getMany();
  }

  async lockSeatForUpdate(
    sessionId: string,
    seatNumber: string,
  ): Promise<Seat | null> {
    return this.createQueryBuilder('seat')
      .setLock('pessimistic_write')
      .where('seat.session_id = :sessionId', { sessionId })
      .andWhere('seat.seat_number = :seatNumber', { seatNumber })
      .andWhere('seat.status = :status', { status: SeatStatus.AVAILABLE })
      .getOne();
  }

  async updateSeatStatus(
    seatId: string,
    status: SeatStatus,
  ): Promise<void> {
    await this.createQueryBuilder()
      .update(Seat)
      .set({
        status,
        version: () => 'version + 1',
      })
      .where('id = :seatId', { seatId })
      .execute();
  }

  async bulkUpdateStatus(
    seatIds: string[],
    status: SeatStatus,
  ): Promise<void> {
    await this.createQueryBuilder()
      .update(Seat)
      .set({
        status,
        version: () => 'version + 1',
      })
      .where('id IN (:...seatIds)', { seatIds })
      .execute();
  }

  async countSeatsByStatus(
    sessionId: string,
    status: SeatStatus,
  ): Promise<number> {
    return this.count({
      where: {
        session_id: sessionId,
        status,
      },
    });
  }
}