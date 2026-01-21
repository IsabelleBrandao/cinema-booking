import { Module, Global } from '@nestjs/common';
import { KafkaProducerService } from './producers/kafka.producer';

@Global()
@Module({
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class MessagingModule {}