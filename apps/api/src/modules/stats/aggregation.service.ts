import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SnapshotService } from '../worker/snapshot.service';
import { ServersService } from '../servers/servers.service';

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    private prisma: PrismaService,
    private snapshotService: SnapshotService,
    private serversService: ServersService,
  ) {}

  @Cron('5 0 * * *')
  async aggregateDailyStats() {
    this.logger.log('Starting daily aggregation...');

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setUTCDate(today.getUTCDate() + 1);

    const servers = await this.prisma.server.findMany({
      where: { approvedAt: { not: null } },
      select: { id: true },
    });

    let processed = 0;
    for (const { id: serverId } of servers) {
      await this.aggregateServerDay(serverId, yesterday, today);
      await this.serversService.recalcUptime(serverId, 7);
      processed++;
    }

    const pruned = await this.snapshotService.pruneOldSnapshots();
    this.logger.log(`Aggregation done: ${processed} servers, ${pruned} snapshots pruned`);
  }

  private async aggregateServerDay(serverId: number, from: Date, to: Date): Promise<void> {
    const snapshots = await this.prisma.serverSnapshot.findMany({
      where: { serverId, checkedAt: { gte: from, lt: to } },
      select: { online: true, playersOnline: true },
    });
    if (snapshots.length === 0) return;

    const checksCount = snapshots.length;
    const onlineChecks = snapshots.filter((s) => s.online).length;
    const onlineSnapshots = snapshots.filter((s) => s.online);

    const avgPlayers = onlineSnapshots.length > 0
      ? onlineSnapshots.reduce((sum, s) => sum + s.playersOnline, 0) / onlineSnapshots.length : 0;
    const maxPlayers = onlineSnapshots.length > 0 ? Math.max(...onlineSnapshots.map((s) => s.playersOnline)) : 0;
    const minPlayers = onlineSnapshots.length > 0 ? Math.min(...onlineSnapshots.map((s) => s.playersOnline)) : 0;
    const uptimePercentage = (onlineChecks / checksCount) * 100;

    await this.prisma.serverDailyStats.upsert({
      where: { serverId_date: { serverId, date: from } },
      update: { avgPlayers, maxPlayers, minPlayers, uptimePercentage, checksCount, onlineChecks },
      create: { serverId, date: from, avgPlayers, maxPlayers, minPlayers, uptimePercentage, checksCount, onlineChecks },
    });
  }
}
