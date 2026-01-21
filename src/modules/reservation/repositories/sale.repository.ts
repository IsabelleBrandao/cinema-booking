import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { Sale } from '../entities/sale.entity';

@Injectable()
export class SaleRepository extends Repository<Sale> {
  constructor(private dataSource: DataSource) {
    super(Sale, dataSource.createEntityManager());
  }

  async findUserPurchases(userId: string): Promise<Sale[]> {
    return this.find({
      where: { user_id: userId },
      relations: ['session', 'seat', 'reservation'],
      order: { created_at: 'DESC' },
    });
  }

  async findSalesBySession(sessionId: string): Promise<Sale[]> {
    return this.find({
      where: { session_id: sessionId },
      relations: ['seat'],
      order: { created_at: 'DESC' },
    });
  }

  async findSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    return this.find({
      where: {
        created_at: Between(startDate, endDate),
      },
      relations: ['session', 'seat'],
      order: { created_at: 'DESC' },
    });
  }

  async getTotalRevenue(sessionId?: string): Promise<number> {
    const query = this.createQueryBuilder('sale')
      .select('SUM(sale.price)', 'total');

    if (sessionId) {
      query.where('sale.session_id = :sessionId', { sessionId });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || '0');
  }

  async countSalesByUser(userId: string): Promise<number> {
    return this.count({
      where: { user_id: userId },
    });
  }

  async findSaleWithDetails(saleId: string): Promise<Sale | null> {
    return this.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.session', 'session')
      .leftJoinAndSelect('sale.seat', 'seat')
      .leftJoinAndSelect('sale.reservation', 'reservation')
      .where('sale.id = :saleId', { saleId })
      .getOne();
  }

  async getRevenueBySession(): Promise<
    Array<{ session_id: string; movie_name: string; total: number; count: number }>
  > {
    return this.createQueryBuilder('sale')
      .select('sale.session_id', 'session_id')
      .addSelect('session.movie_name', 'movie_name')
      .addSelect('SUM(sale.price)', 'total')
      .addSelect('COUNT(sale.id)', 'count')
      .leftJoin('sale.session', 'session')
      .groupBy('sale.session_id')
      .addGroupBy('session.movie_name')
      .orderBy('total', 'DESC')
      .getRawMany();
  }
}