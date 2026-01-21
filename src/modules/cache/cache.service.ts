import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // ttl no cache-manager v5+ é em milissegundos, mas o redis-store as vezes trata como segundos.
    // Vamos garantir um padrão seguro.
    await this.cacheManager.set(key, value, ttl || 0); 
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  // Método avançado para limpar chaves por padrão (ex: limpar cache de uma sessão específica)
  async delPattern(pattern: string): Promise<void> {
    const store = (this.cacheManager as any).store;
    if (store.keys) {
      const keys = await store.keys(pattern);
      if (keys.length > 0) {
        await store.del(keys);
      }
    }
  }
}