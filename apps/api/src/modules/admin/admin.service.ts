import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmissionsService } from '../submissions/submissions.service';
import type { ReviewSubmissionDto } from './dto/review-submission.dto';
import type { UpdateServerDto } from './dto/update-server.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private submissionsService: SubmissionsService,
  ) {}

  // ─── Submissions ──────────────────────────────────────────────────────────

  async listSubmissions(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED' } : {};
    const [total, items] = await Promise.all([
      this.prisma.serverSubmission.count({ where }),
      this.prisma.serverSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async approveSubmission(id: number, dto: ReviewSubmissionDto, adminId: number, ip: string) {
    const submission = await this.prisma.serverSubmission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status === 'APPROVED') throw new BadRequestException('Already approved');

    const slug = await this.submissionsService.generateSlug(submission.name);

    const [server] = await this.prisma.$transaction([
      this.prisma.server.create({
        data: {
          name: submission.name, slug, host: submission.host, port: submission.port,
          type: submission.type, websiteUrl: submission.websiteUrl,
          discordUrl: submission.discordUrl, approvedAt: new Date(),
        },
      }),
      this.prisma.serverSubmission.update({
        where: { id },
        data: { status: 'APPROVED', notes: dto.notes ?? null, reviewedAt: new Date(), reviewedById: adminId },
      }),
      this.prisma.auditLog.create({
        data: { adminId, action: 'APPROVE_SUBMISSION', entityType: 'ServerSubmission', entityId: id, metadataJson: JSON.stringify({ slug }), ip },
      }),
    ]);

    this.logger.log(`Submission #${id} approved → server ${slug}`);
    return server;
  }

  async rejectSubmission(id: number, dto: ReviewSubmissionDto, adminId: number, ip: string) {
    const submission = await this.prisma.serverSubmission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');

    await this.prisma.$transaction([
      this.prisma.serverSubmission.update({
        where: { id },
        data: { status: 'REJECTED', notes: dto.notes ?? null, reviewedAt: new Date(), reviewedById: adminId },
      }),
      this.prisma.auditLog.create({
        data: { adminId, action: 'REJECT_SUBMISSION', entityType: 'ServerSubmission', entityId: id, metadataJson: JSON.stringify({ reason: dto.notes }), ip },
      }),
    ]);
    return { message: 'Submission rejected' };
  }

  async deleteSubmission(id: number, adminId: number, ip: string) {
    const submission = await this.prisma.serverSubmission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');
    await this.prisma.$transaction([
      this.prisma.serverSubmission.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: { adminId, action: 'DELETE_SUBMISSION', entityType: 'ServerSubmission', entityId: id, ip },
      }),
    ]);
    return { message: 'Submission deleted' };
  }

  // ─── Servers ──────────────────────────────────────────────────────────────

  async listServers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.server.count(),
      this.prisma.server.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateServer(id: number, dto: UpdateServerDto, adminId: number, ip: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');
    const updated = await this.prisma.server.update({ where: { id }, data: dto });
    await this.prisma.auditLog.create({
      data: { adminId, action: 'UPDATE_SERVER', entityType: 'Server', entityId: id, metadataJson: JSON.stringify(dto), ip },
    });
    return updated;
  }

  async deleteServer(id: number, adminId: number, ip: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');
    await this.prisma.$transaction([
      this.prisma.server.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: { adminId, action: 'DELETE_SERVER', entityType: 'Server', entityId: id, ip },
      }),
    ]);
    return { message: 'Server deleted' };
  }

  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { admin: { select: { email: true } } },
      }),
    ]);
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getDashboardStats() {
    const [
      totalServers,
      onlineServers,
      pendingSubmissions,
      totalSubmissions,
      peakServersRaw,
      peakPlayersRaw,
      peakSingleServer,
    ] = await Promise.all([
      this.prisma.server.count({ where: { approvedAt: { not: null } } }),
      this.prisma.server.count({ where: { status: 'ONLINE' } }),
      this.prisma.serverSubmission.count({ where: { status: 'PENDING' } }),
      this.prisma.serverSubmission.count(),
      // Peak concurrent servers online at any single check cycle
      this.prisma.$queryRaw<{ max_cnt: bigint | null }[]>`
        SELECT MAX(cnt) AS max_cnt FROM (
          SELECT checked_at, COUNT(*) AS cnt
          FROM server_snapshots
          WHERE online = 1
          GROUP BY checked_at
        ) AS t
      `,
      // Peak total players across all servers at any single check cycle
      this.prisma.$queryRaw<{ max_total: bigint | null }[]>`
        SELECT MAX(total) AS max_total FROM (
          SELECT checked_at, SUM(players_online) AS total
          FROM server_snapshots
          WHERE online = 1
          GROUP BY checked_at
        ) AS t
      `,
      // All-time peak players on a single server
      this.prisma.server.aggregate({
        _max: { peakPlayers: true },
        where: { approvedAt: { not: null } },
      }),
    ]);

    return {
      totalServers,
      onlineServers,
      pendingSubmissions,
      totalSubmissions,
      peakServersOnline: Number(peakServersRaw[0]?.max_cnt ?? 0),
      peakPlayersTotal: Number(peakPlayersRaw[0]?.max_total ?? 0),
      peakPlayersSingleServer: peakSingleServer._max.peakPlayers ?? 0,
    };
  }
}
