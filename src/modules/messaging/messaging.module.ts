import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './producers/kafka.producer';
import { KafkaConsumerController } from './kafka.consumer.controller'; // <--- Importe Novo

@Global() // <--- Importante: Torna o módulo Global para não precisar importar em todo lugar
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'cinema-api-producer',
            // Pega do .env ou usa o padrão do Docker
            brokers: (process.env.KAFKA_BROKERS || 'kafka:9093').split(','),
          },
          consumer: {
            groupId: 'cinema-booking-group',
          },
        },
      },
    ]),
  ],
  controllers: [KafkaConsumerController],
  providers: [KafkaProducerService],
  exports: [KafkaProducerService], // Exportamos para o ReservationModule usar
})
export class MessagingModule {}