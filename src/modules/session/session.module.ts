import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { Session } from './entities/session.entity';
import { Seat } from './entities/seat.entity';
import { CacheModule } from '../cache/cache.module';
import { SessionTransformer } from './transformer/session.transformer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Seat]),
    CacheModule,
  ],
  controllers: [SessionController],
  providers: [
    SessionService, 
    SessionTransformer 
  ],
  exports: [SessionService],
})
export class SessionModule {}