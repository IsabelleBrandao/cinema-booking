import { ConfigService } from '@nestjs/config';
import { KafkaConfig } from 'kafkajs';

export const getKafkaConfig = (configService: ConfigService): KafkaConfig => ({
  clientId: configService.get<string>(
    'KAFKA_CLIENT_ID',
    'cinema-booking-system',
  ),
  brokers: configService
    .get<string>('KAFKA_BROKERS', 'localhost:9092')
    .split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
  connectionTimeout: 10000,
  requestTimeout: 30000,
});

export const KAFKA_TOPICS = {
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_EXPIRED: 'reservation.expired',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  SEAT_RELEASED: 'seat.released',
} as const;