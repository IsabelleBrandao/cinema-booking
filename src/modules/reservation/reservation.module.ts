import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { Reservation } from './entities/reservation.entity';
import { Sale } from './entities/sale.entity';
import { Seat } from '../session/entities/seat.entity';
import { Session } from '../session/entities/session.entity';
import { ReservationExpirationJob } from '../../jobs/reservation-expiration.job';
// Importações Faltantes
import { CacheModule } from '../cache/cache.module';
import { MessagingModule } from '../messaging/messaging.module';
import { ReservationTransformer } from './transformer/reservation.transformer'; // Vamos criar este já já

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Sale, Seat, Session]),
    CacheModule,      // <--- Essencial
    MessagingModule,  // <--- Essencial
  ],
  controllers: [ReservationController],
  providers: [
    ReservationService, 
    ReservationExpirationJob,
    ReservationTransformer // <--- Adicione aqui
  ],
  exports: [ReservationService],
})
export class ReservationModule {}