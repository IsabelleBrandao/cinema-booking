import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { Reservation } from './entities/reservation.entity';
import { Sale } from './entities/sale.entity';
import { Seat } from '../session/entities/seat.entity';
import { Session } from '../session/entities/session.entity';
import { ReservationExpirationJob } from '../../jobs/reservation-expiration.job';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Sale, Seat, Session])],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationExpirationJob],
  exports: [ReservationService],
})
export class ReservationModule {}