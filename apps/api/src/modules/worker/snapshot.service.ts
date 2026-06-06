import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { PingResult } from '../ping/ping.service';

@Injectable()
export class SnapshotService {
  constructor(private prisma: PrismaService) {}

  async saveSnapshot(serverId: number, result: PingResult): Promise<void> {
    const motdHash = result.motd
      ? crypto.createHash('sha256').update(result.motd).digest('hex')
      : null;

    await this.prisma.serverSnapshot.create({
      data: {
        serverId,
        online: result.online,
        playersOnline: result.playersOnline,
        playersMax: result.playersMax,
        version: result.version,
        latencyMs: result.online ? result.latencyMs : null,
        motdHash,
        errorMessage: result.error?.slice(0, 500) ?? null,
      },
    });
  }

  async pruneOldSnapshots(): Promise<number> {
    // Keep only 25h — snapshots are only used for the 24h chart view.
    // Longer history uses server_daily_stats instead.
    const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const result = await this.prisma.serverSnapshot.deleteMany({
      where: { checkedAt: { lt: cutoff } },
    });
    return result.count;
  }
}
