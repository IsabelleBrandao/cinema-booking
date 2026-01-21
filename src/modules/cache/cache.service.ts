import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConfig } from '../../config/redis.config';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTTL: number;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(getRedisConfig(configService));
    this.defaultTTL = this.configService.get<number>('REDIS_TTL', 1800);

    this.redis.on('connect', () => {
      this.logger.log('Conectado ao Redis com sucesso');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Erro na conexão com Redis', err);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Erro ao buscar chave ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      await this.redis.setex(key, expiry, serialized);
      this.logger.debug(`Chave ${key} armazenada com TTL de ${expiry}s`);
    } catch (error) {
      this.logger.error(`Erro ao armazenar chave ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Chave ${key} removida do cache`);
    } catch (error) {
      this.logger.error(`Erro ao remover chave ${key}`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(
          `${keys.length} chaves removidas com padrão ${pattern}`,
        );
      }
    } catch (error) {
      this.logger.error(`Erro ao remover padrão ${pattern}`, error);
    }
  }

  async acquireLock(
    key: string,
    ttl: number = 10,
  ): Promise<boolean> {
    try {
      const result = await this.redis.set(
        `lock:${key}`,
        '1',
        'EX',
        ttl,
        'NX',
      );
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Erro ao adquirir lock ${key}`, error);
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.del(`lock:${key}`);
      this.logger.debug(`Lock ${key} liberado`);
    } catch (error) {
      this.logger.error(`Erro ao liberar lock ${key}`, error);
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
    this.logger.log('Conexão com Redis encerrada');
  }
}