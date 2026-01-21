import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionRepository extends Repository<Session> {
  constructor(private dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  async findActiveSessionsByDate(startDate: Date, endDate: Date): Promise<Session[]> {
    return this.createQueryBuilder('session')
      .where('session.is_active = :isActive', { isActive: true })
      .andWhere('session.start_time BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('session.start_time', 'ASC')
      .getMany();
  }

  async findSessionWithSeats(sessionId: string): Promise<Session | null> {
    return this.createQueryBuilder('session')
      .leftJoinAndSelect('session.seats', 'seats')
      .where('session.id = :sessionId', { sessionId })
      .getOne();
  }

  async updateAvailableSeats(
    sessionId: string,
    increment: number,
  ): Promise<void> {
    await this.createQueryBuilder()
      .update(Session)
      .set({
        available_seats: () => `available_seats + ${increment}`,
      })
      .where('id = :sessionId', { sessionId })
      .execute();
  }

  async findSessionsWithLowAvailability(threshold: number): Promise<Session[]> {
    return this.createQueryBuilder('session')
      .where('session.is_active = :isActive', { isActive: true })
      .andWhere('session.available_seats <= :threshold', { threshold })
      .andWhere('session.available_seats > 0')
      .orderBy('session.available_seats', 'ASC')
      .getMany();
  }
}