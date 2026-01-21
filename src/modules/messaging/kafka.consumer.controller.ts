import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '../../config/kafka.config';

@Controller()
export class KafkaConsumerController {
  private readonly logger = new Logger(KafkaConsumerController.name);

  @EventPattern(KAFKA_TOPICS.RESERVATION_CREATED)
  async handleReservationCreated(@Payload() message: any) {
    this.logger.log(`📩 [EMAIL] Enviando confirmação de reserva para usuário ${message.user_id}...`);
    // Aqui entraria a lógica real de envio de email
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_CONFIRMED)
  async handlePaymentConfirmed(@Payload() message: any) {
    this.logger.log(`🎟️ [TICKET] Gerando ingresso para a venda ${message.sale_id}...`);
    // Aqui entraria a lógica de gerar PDF
  }

  @EventPattern(KAFKA_TOPICS.SEAT_RELEASED)
  async handleSeatReleased(@Payload() message: any) {
    this.logger.warn(`♻️ [SISTEMA] Assento liberado da reserva ${message.reservation_id}.`);
  }
}