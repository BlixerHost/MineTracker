import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PingService } from '../ping/ping.service';
import { SnapshotService } from './snapshot.service';
import { ServersService } from '../servers/servers.service';
import { RedisService } from '../../redis/redis.service';

export interface MonitorJobData {
  serverId: number;
  host: string;
  port: number;
  type: 'JAVA' | 'BEDROCK';
}

export const MONITOR_QUEUE = 'server-monitor';

@Injectable()
export class MonitorProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitorProcessor.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private worker!: Worker<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queue!: Queue<any>;

  constructor(
    private pingService: PingService,
    private snapshotService: SnapshotService,
    private serversService: ServersService,
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.redis.available) {
      // No Redis — use an in-process mock queue that runs jobs directly
      this.logger.warn('No Redis — BullMQ disabled, using direct in-process pings');
      this.queue = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        add: async (_name: string, data: MonitorJobData) => {
          // Fire and forget — don't await to avoid blocking the scheduler
          void this.process({ data } as Job<MonitorJobData>);
          return {} as Job;
        },
        close: async () => {},
      } as unknown as Queue;
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = this.redis.getClient() as any;
    const concurrency = this.config.get<number>('PING_CONCURRENCY', 50);

    this.queue = new Queue(MONITOR_QUEUE, { connection });

    this.worker = new Worker(
      MONITOR_QUEUE,
      async (job: Job) => this.process(job as Job<MonitorJobData>),
      { connection, concurrency, removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job failed for server #${(job?.data as MonitorJobData)?.serverId}: ${err.message}`);
    });

    this.logger.log(`Monitor worker started with BullMQ (concurrency: ${concurrency})`);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async process(job: Job<MonitorJobData>): Promise<void> {
    const { serverId, host, port, type } = job.data;

    try {
      const result = await this.pingService.ping(host, port, type);

      await this.snapshotService.saveSnapshot(serverId, result);
      await this.serversService.updateFromPing(serverId, {
        online: result.online, playersOnline: result.playersOnline,
        playersMax: result.playersMax, version: result.version,
        motd: result.motd, faviconData: result.favicon, latencyMs: result.latencyMs,
      });

      await this.redis.cacheServerStatus(serverId, {
        online: result.online, playersOnline: result.playersOnline,
        playersMax: result.playersMax, version: result.version,
        latencyMs: result.latencyMs, checkedAt: new Date().toISOString(),
      });
      await this.redis.invalidateRankingCache();

    } catch (err) {
      this.logger.warn(
        `Ping failed #${serverId} (${host}:${port}): ${err instanceof Error ? err.message : String(err)}`,
      );
      await this.snapshotService.saveSnapshot(serverId, {
        online: false, playersOnline: 0, playersMax: 0,
        version: null, motd: null, favicon: null, latencyMs: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      await this.serversService.updateFromPing(serverId, {
        online: false, playersOnline: 0, playersMax: 0,
        version: null, motd: null, faviconData: null, latencyMs: 0,
      });
    }
  }
}
