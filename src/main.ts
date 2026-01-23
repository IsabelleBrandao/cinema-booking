import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { kafkaConfig } from './config/kafka.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // KAFKA
  app.connectMicroservice(kafkaConfig);
  await app.startAllMicroservices();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Cinema Booking System') 
    .setDescription('High Concurrency Ticket Booking API with ACID compliance.')
    .setVersion('1.0')
    .addTag('Sessões')
    .addTag('Reservas')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Aplicação rodando na porta ${port}`);
  logger.log(`Swagger disponível em http://localhost:${port}/api-docs`);
}

bootstrap();
