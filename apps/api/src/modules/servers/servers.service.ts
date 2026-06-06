import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { ListServersDto } from './dto/list-servers.dto';
import type { StatsQueryDto } from './dto/stats-query.dto';

export interface ServerDto {
  id: number;
  name: string;
  slug: string;
  host: string;
  port: number;
  type: string;
  status: string;
  motd: string | null;
  version: string | null;
  faviconUrl: string | null;
  playersOnline: number;
  playersMax: number;
  peakPlayers: number;
  latencyMs: number | null;
  uptimePercentage: number;
  country: string | null;
  websiteUrl: string | null;
  discordUrl: string | null;
  approvedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class ServersService {
  private readonly logger = new Logger(ServersService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(dto: ListServersDto): Promise<PaginatedResponse<ServerDto>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServerWhereInput = {
      approvedAt: { not: null },
      ...(dto.type && { type: dto.type }),
      ...(dto.status && { status: dto.status }),
      ...(dto.country && { country: dto.country.toUpperCase() }),
      ...(dto.version && { version: { contains: dto.version } }),
      ...(dto.search && {
        OR: [
          { name: { contains: dto.search } },
          { host: { contains: dto.search } },
          { motd: { contains: dto.search } },
        ],
      }),
    };

    const orderBy = this.buildOrderBy(dto.sort ?? 'players_online', dto.order ?? 'desc');

    const [total, servers] = await Promise.all([
      this.prisma.server.count({ where }),
      this.prisma.server.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true, name: true, slug: true, host: true, port: true,
          type: true, status: true, motd: true, version: true,
          faviconData: true, playersOnline: true, playersMax: true,
          peakPlayers: true, latencyMs: true, uptimePercentage: true,
          country: true, websiteUrl: true, discordUrl: true,
          approvedAt: true, lastCheckedAt: true, createdAt: true,
        },
      }),
    ]);

    return {
      data: servers.map(this.toDto),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string): Promise<ServerDto> {
    const server = await this.prisma.server.findFirst({
      where: { slug, approvedAt: { not: null } },
    });
    if (!server) throw new NotFoundException('Server not found');
    return this.toDto(server);
  }

  async getStats(slug: string, range: StatsQueryDto['range']) {
    const server = await this.prisma.server.findFirst({
      where: { slug, approvedAt: { not: null } },
      select: { id: true },
    });
    if (!server) throw new NotFoundException('Server not found');

    const now = new Date();

    if (range === '24h') {
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return this.prisma.serverSnapshot.findMany({
        where: { serverId: server.id, checkedAt: { gte: since } },
        orderBy: { checkedAt: 'asc' },
        select: { checkedAt: true, online: true, playersOnline: true, playersMax: true, latencyMs: true },
      });
    }

    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, all: 3650 };
    const days = daysMap[range ?? '7d'];
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return this.prisma.serverDailyStats.findMany({
      where: {
        serverId: server.id,
        ...(range !== 'all' && { date: { gte: since } }),
      },
      orderBy: { date: 'asc' },
      select: { date: true, avgPlayers: true, maxPlayers: true, minPlayers: true, uptimePercentage: true },
    });
  }

  async getGlobalStats() {
    const [agg, serversOnline, totalServers] = await Promise.all([
      this.prisma.server.aggregate({
        where: { approvedAt: { not: null }, status: 'ONLINE' },
        _sum: { playersOnline: true },
      }),
      this.prisma.server.count({ where: { approvedAt: { not: null }, status: 'ONLINE' } }),
      this.prisma.server.count({ where: { approvedAt: { not: null } } }),
    ]);
    return {
      playersOnline: agg._sum.playersOnline ?? 0,
      serversOnline,
      totalServers,
    };
  }

  // ─── Internal (used by worker + admin) ───────────────────────────────────

  async findAllApproved() {
    return this.prisma.server.findMany({
      where: { approvedAt: { not: null } },
      select: { id: true, host: true, port: true, type: true, lastCheckedAt: true },
    });
  }

  async updateFromPing(
    serverId: number,
    data: {
      online: boolean;
      playersOnline: number;
      playersMax: number;
      version: string | null;
      motd: string | null;
      faviconData: string | null;
      latencyMs: number;
    },
  ) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { peakPlayers: true },
    });
    if (!server) return;

    const newPeak = Math.max(server.peakPlayers, data.playersOnline);

    await this.prisma.server.update({
      where: { id: serverId },
      data: {
        status: data.online ? 'ONLINE' : 'OFFLINE',
        playersOnline: data.online ? data.playersOnline : 0,
        playersMax: data.online ? data.playersMax : 0,
        ...(data.version && { version: data.version }),
        ...(data.motd && { motd: data.motd }),
        ...(data.faviconData && { faviconData: data.faviconData }),
        latencyMs: data.online ? data.latencyMs : null,
        peakPlayers: newPeak,
        lastCheckedAt: new Date(),
      },
    });
  }

  async recalcUptime(serverId: number, windowDays = 7): Promise<void> {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const snapshots = await this.prisma.serverSnapshot.findMany({
      where: { serverId, checkedAt: { gte: since } },
      select: { online: true },
    });

    if (snapshots.length === 0) return;

    const onlineCount = snapshots.filter((s) => s.online).length;
    const uptime = (onlineCount / snapshots.length) * 100;

    await this.prisma.server.update({
      where: { id: serverId },
      data: { uptimePercentage: uptime },
    });
  }

  private buildOrderBy(sort: string, order: 'asc' | 'desc'): Prisma.ServerOrderByWithRelationInput {
    const map: Record<string, Prisma.ServerOrderByWithRelationInput> = {
      players_online: { playersOnline: order },
      name: { name: order },
      created_at: { createdAt: order },
      uptime: { uptimePercentage: order },
    };
    return map[sort] ?? { playersOnline: 'desc' };
  }

  private toDto(server: Record<string, unknown>): ServerDto {
    return {
      id: server['id'] as number,
      name: server['name'] as string,
      slug: server['slug'] as string,
      host: server['host'] as string,
      port: server['port'] as number,
      type: server['type'] as string,
      status: server['status'] as string,
      motd: (server['motd'] as string | null) ?? null,
      version: (server['version'] as string | null) ?? null,
      faviconUrl: (server['faviconData'] as string | null) ?? null,
      playersOnline: (server['playersOnline'] as number) ?? 0,
      playersMax: (server['playersMax'] as number) ?? 0,
      peakPlayers: (server['peakPlayers'] as number) ?? 0,
      latencyMs: (server['latencyMs'] as number | null) ?? null,
      uptimePercentage: Number(server['uptimePercentage'] ?? 0),
      country: (server['country'] as string | null) ?? null,
      websiteUrl: (server['websiteUrl'] as string | null) ?? null,
      discordUrl: (server['discordUrl'] as string | null) ?? null,
      approvedAt: server['approvedAt'] ? (server['approvedAt'] as Date).toISOString() : null,
      lastCheckedAt: server['lastCheckedAt'] ? (server['lastCheckedAt'] as Date).toISOString() : null,
      createdAt: (server['createdAt'] as Date).toISOString(),
    };
  }
}
