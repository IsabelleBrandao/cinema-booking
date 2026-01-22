import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '../../config/kafka.config';
import { KafkaProducerService } from './producers/kafka.producer';

@Controller()
export class KafkaConsumerController {
  private readonly logger = new Logger(KafkaConsumerController.name);

  // 1. Injetamos o Producer para poder enviar para a DLQ
  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  @EventPattern(KAFKA_TOPICS.RESERVATION_CREATED)
  async handleReservationCreated(@Payload() message: any) {
    try {
      this.logger.log(
        ` [EMAIL] Enviando confirmação de reserva para usuário ${message.user_id}...`,
      );
    } catch (error) {
      // 2. Se der erro, mandamos para a DLQ
      await this.sendToDlq(
        KAFKA_TOPICS.DLQ.RESERVATION_CREATED,
        message,
        error,
      );
    }
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_CONFIRMED)
  async handlePaymentConfirmed(@Payload() message: any) {
    try {
      this.logger.log(
        `[TICKET] Gerando ingresso para a venda ${message.sale_id}...`,
      );
    } catch (error) {
      await this.sendToDlq(KAFKA_TOPICS.DLQ.PAYMENT_CONFIRMED, message, error);
    }
  }

  @EventPattern(KAFKA_TOPICS.SEAT_RELEASED)
  async handleSeatReleased(@Payload() message: any) {
    try {
      this.logger.warn(
        `[SISTEMA] Assento liberado da reserva ${message.reservation_id}.`,
      );
    } catch (error) {
      await this.sendToDlq(KAFKA_TOPICS.DLQ.SEAT_RELEASED, message, error);
    }
  }

  // --- Método Auxiliar para DLQ ---
  private async sendToDlq(topic: string, originalMessage: any, error: any) {
    this.logger.error(
      `Erro ao processar mensagem. Enviando para DLQ: ${topic}`,
      error.stack,
    );

    const dlqMessage = {
      original_message: originalMessage,
      error_reason: error.message,
      failed_at: new Date().toISOString(),
      retry_count: 0,
    };

    await this.kafkaProducer.produce(topic, dlqMessage);
  }
}
