import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Session } from '../modules/session/entities/session.entity';
import { Seat } from '../modules/session/entities/seat.entity';
import { Reservation } from '../modules/reservation/entities/reservation.entity';
import { Sale } from '../modules/reservation/entities/sale.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER', 'cinema_user'),
  password: configService.get<string>('DATABASE_PASSWORD', 'cinema_password'),
  database: configService.get<string>('DATABASE_NAME', 'cinema_db'),
  entities: [Session, Seat, Reservation, Sale],
  synchronize: configService.get<boolean>('DATABASE_SYNC', true),
  logging: configService.get<boolean>('DATABASE_LOGGING', false),
  poolSize: 20,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});