import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// Thin cache-aside wrapper. A Redis hiccup must never break a read — every
// method swallows errors and falls back to "cache miss" so callers just hit
// PostgreSQL instead. This is dashboard/list caching, not a source of truth.
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(host: string, port: number) {
    this.client = new Redis({ host, port, lazyConnect: false, maxRetriesPerRequest: 1 });
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch (err) {
      this.logger.warn(`GET ${key} failed: ${err.message}`);
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`SET ${key} failed: ${err.message}`);
    }
  }

  // Invalidate every key under a prefix, e.g. "project-service:projects:*"
  async delByPrefix(prefix: string): Promise<void> {
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length) await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`DEL prefix ${prefix} failed: ${err.message}`);
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
