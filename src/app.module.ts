import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';

// Módulos da Aplicação
import { SessionModule } from './modules/session/session.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { CacheModule } from './modules/cache/cache.module';

@Module({
  imports: [
    // Configurações Globais
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    ScheduleModule.forRoot(), // Habilita o Cron Job

    // Nossos Módulos
    CacheModule,
    MessagingModule,
    SessionModule,
    ReservationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}