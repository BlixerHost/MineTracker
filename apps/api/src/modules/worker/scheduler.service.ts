import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { MonitorProcessor } from './monitor.processor';
import { SnapshotService } from './snapshot.service';
import { ServersService } from '../servers/servers.service';
import type { MonitorJobData } from './monitor.processor';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private pingIntervalMs: number;

  constructor(
    private monitor: MonitorProcessor,
    private snapshotService: SnapshotService,
    private serversService: ServersService,
    private config: ConfigService,
  ) {
    this.pingIntervalMs = config.get<number>('PING_INTERVAL_SECONDS', 10) * 1000;
  }

  async onModuleInit() {
    setTimeout(() => this.scheduleAll(), 5000);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async pruneSnapshots() {
    const deleted = await this.snapshotService.pruneOldSnapshots();
    if (deleted > 0) this.logger.log(`Pruned ${deleted} old snapshots`);
  }

  @Cron('*/5 * * * * *')
  async scheduleAll() {
    const servers = await this.serversService.findAllApproved();
    const now = Date.now();
    let queued = 0;

    for (const server of servers) {
      const lastChecked = server.lastCheckedAt?.getTime() ?? 0;
      if (now - lastChecked >= this.pingIntervalMs) {
        const jobData: MonitorJobData = {
          serverId: server.id, host: server.host, port: server.port,
          type: server.type as 'JAVA' | 'BEDROCK',
        };
        await this.monitor.queue.add('ping', jobData, {
          jobId: `monitor:${server.id}`,
          removeOnComplete: true,
          removeOnFail: { age: 3600 },
        });
        queued++;
      }
    }

    if (queued > 0) this.logger.debug(`Queued ${queued} ping job(s)`);
  }

  async recheckServer(serverId: number): Promise<void> {
    const servers = await this.serversService.findAllApproved();
    const server = servers.find((s) => s.id === serverId);
    if (!server) throw new Error(`Server #${serverId} not found`);

    await this.monitor.queue.add(
      'ping',
      { serverId: server.id, host: server.host, port: server.port, type: server.type as 'JAVA' | 'BEDROCK' },
      { jobId: `recheck:${serverId}:${Date.now()}`, priority: 1 },
    );

    this.logger.log(`Manual recheck queued for server #${serverId}`);
  }
}
