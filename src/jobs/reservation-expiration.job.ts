import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationService } from '../modules/reservation/reservation.service';

@Injectable()
export class ReservationExpirationJob {
  private readonly logger = new Logger(ReservationExpirationJob.name);

  constructor(private readonly reservationService: ReservationService) {}

  // Roda a cada 10 segundos para verificar reservas expiradas
  @Cron('*/10 * * * * *')
  async handleCron() {
    // this.logger.debug('Verificando reservas expiradas...');
    await this.reservationService.expireReservations();
  }
}