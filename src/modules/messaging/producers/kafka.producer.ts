import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Conecta no Kafka ao iniciar a aplicação
    try {
      await this.kafkaClient.connect();
      this.logger.log('Conectado ao Kafka com sucesso!');
    } catch (error) {
      this.logger.error('Erro ao conectar no Kafka', error);
    }
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  // Método genérico para enviar mensagens
  async produce(topic: string, message: any) {
    try {
      // O 'emit' do NestJS retorna um Observable, usamos lastValueFrom para aguardar (Promise)
      // 'emit' é fire-and-forget (não espera resposta), ideal para eventos.
      await lastValueFrom(this.kafkaClient.emit(topic, message));
      this.logger.log(`Mensagem enviada para o tópico: ${topic}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem para ${topic}`, error);
      // Não damos throw aqui para não derrubar a reserva se o Kafka falhar momentaneamente
    }
  }
}