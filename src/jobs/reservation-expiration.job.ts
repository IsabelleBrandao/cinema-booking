import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationService } from '../modules/reservation/reservation.service';

@Injectable()
export class ReservationExpirationJob {
  private readonly logger = new Logger(ReservationExpirationJob.name);

  constructor(private readonly reservationService: ReservationService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleReservationExpiration() {
    this.logger.debug('Executando job de expiração de reservas');

    try {
      await this.reservationService.expireReservations();
    } catch (error) {
      this.logger.error('Erro ao executar job de expiração', error);
    }
  }
}