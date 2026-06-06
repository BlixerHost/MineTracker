import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private _available = false;

  constructor(@Inject('REDIS_OPTIONS') private opts: { url: string }) {}

  get available(): boolean {
    return this._available;
  }

  async onModuleInit() {
    if (!this.opts.url) {
      this.logger.warn('REDIS_URL not set — Redis disabled (dev mode, no caching)');
      return;
    }

    this.client = new Redis(this.opts.url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) =>
      this.logger.warn(`Redis error: ${err.message}`),
    );

    try {
      await this.client.connect();
      this._available = true;
      this.logger.log('Redis connected');
    } catch (err) {
      this.logger.warn(`Redis unavailable — running without cache: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this._available) await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  // ─── Server state cache ───────────────────────────────────────────────────

  async cacheServerStatus(serverId: number, data: object, ttlSeconds = 90) {
    if (!this._available) return;
    await this.client.set(
      `server:${serverId}:current`,
      JSON.stringify(data),
      'EX',
      ttlSeconds,
    );
  }

  async getServerStatus(serverId: number): Promise<object | null> {
    if (!this._available) return null;
    const raw = await this.client.get(`server:${serverId}:current`);
    return raw ? (JSON.parse(raw) as object) : null;
  }

  async invalidateServerStatus(serverId: number) {
    if (!this._available) return;
    await this.client.del(`server:${serverId}:current`);
  }

  async invalidateRankingCache() {
    if (!this._available) return;
    await this.client.del('servers:ranking');
  }

  // ─── Rate limiting ────────────────────────────────────────────────────────
  // Fail-closed in production: if Redis is down, submissions are blocked.
  // In development, Redis is optional and rate limiting is skipped.

  async checkSubmitRateLimit(
    ipHash: string,
    limitPerHour: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    if (!this._available) {
      if (process.env['NODE_ENV'] === 'production') {
        this.logger.error('Redis unavailable in production — blocking submission to prevent rate-limit bypass');
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: limitPerHour };
    }

    const key = `ratelimit:submit:${ipHash}`;
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, 3600);

    return {
      allowed: count <= limitPerHour,
      remaining: Math.max(0, limitPerHour - count),
    };
  }

  // ─── Health check ─────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    if (!this._available) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
