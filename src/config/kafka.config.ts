import { ClientOptions, Transport } from '@nestjs/microservices';

export const KAFKA_TOPICS = {
  RESERVATION_CREATED: 'reservation.created',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  SEAT_RELEASED: 'seat.released',
};

// Configuração para conectar no Kafka
// O broker 'kafka:9093' é o endereço interno do Docker (veja seu docker-compose)
export const kafkaConfig: ClientOptions = {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'cinema-booking-client',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    },
    consumer: {
      groupId: 'cinema-booking-consumer-group', // Importante para não processar msg duplicada
    },
  },
};