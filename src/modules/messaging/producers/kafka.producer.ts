import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { getKafkaConfig } from '../../../config/kafka.config';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka(getKafkaConfig(configService));
    this.producer = this.kafka.producer({
      retry: {
        retries: 5,
      },
      idempotent: true,
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Produtor Kafka conectado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao conectar produtor Kafka', error);
      throw error;
    }
  }

  async produce(topic: string, message: any): Promise<void> {
    try {
      const record: ProducerRecord = {
        topic,
        messages: [
          {
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      };

      await this.producer.send(record);
      this.logger.log(`Mensagem publicada no tópico ${topic}`);
      this.logger.debug(`Payload: ${JSON.stringify(message)}`);
    } catch (error) {
      this.logger.error(
        `Erro ao publicar mensagem no tópico ${topic}`,
        error,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Produtor Kafka desconectado');
    } catch (error) {
      this.logger.error('Erro ao desconectar produtor Kafka', error);
    }
  }
}