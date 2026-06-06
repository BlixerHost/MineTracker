import {
  Injectable, Logger, BadRequestException,
  ConflictException, ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import slugify from 'slugify';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SsrfGuardService } from '../ping/ssrf-guard.service';
import { PingService } from '../ping/ping.service';
import type { SubmitServerDto } from './dto/submit-server.dto';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private ssrfGuard: SsrfGuardService,
    private pingService: PingService,
    private config: ConfigService,
  ) {}

  async submit(dto: SubmitServerDto, submitterIp: string) {
    if ((dto as unknown as Record<string, unknown>)['website']) {
      return { message: 'Submission received' };
    }

    const submissionsEnabled = this.config.get<boolean>('ENABLE_SERVER_SUBMISSIONS', true);
    if (!submissionsEnabled) throw new ForbiddenException('Server submissions are currently disabled');

    const ipHash = this.hashIp(submitterIp);
    const limitPerHour = this.config.get<number>('SUBMISSION_RATE_LIMIT_PER_HOUR', 5);
    const { allowed } = await this.redis.checkSubmitRateLimit(ipHash, limitPerHour);
    if (!allowed) throw new BadRequestException('Too many submissions. Please wait before submitting again.');

    await this.ssrfGuard.validateHost(dto.host);
    this.ssrfGuard.validatePort(dto.port);

    const existing = await this.prisma.serverSubmission.findFirst({
      where: { host: dto.host, port: dto.port, type: dto.type, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (existing) throw new ConflictException('A server with this address is already listed or pending review');

    const approvedExists = await this.prisma.server.findFirst({
      where: { host: dto.host, port: dto.port, type: dto.type },
    });
    if (approvedExists) throw new ConflictException('A server with this address is already listed');

    let lastPingError: string | null = null;
    let initialStatus: 'PENDING' | 'FAILED' = 'PENDING';

    try {
      const pingResult = await this.pingService.ping(dto.host, dto.port, dto.type);
      if (!pingResult.online) {
        lastPingError = pingResult.error ?? 'Server did not respond';
        initialStatus = 'FAILED';
      }
    } catch (err) {
      lastPingError = err instanceof Error ? err.message : 'Ping failed';
      initialStatus = 'FAILED';
    }

    const submission = await this.prisma.serverSubmission.create({
      data: {
        name: dto.name, host: dto.host, port: dto.port, type: dto.type,
        websiteUrl: dto.websiteUrl ?? null, discordUrl: dto.discordUrl ?? null,
        contactEmail: dto.contactEmail ?? null,
        submitterIpHash: ipHash, status: initialStatus, lastPingError,
      },
    });

    this.logger.log(`Submission #${submission.id}: ${dto.host}:${dto.port} (${dto.type}) status=${initialStatus}`);

    return {
      message: initialStatus === 'PENDING'
        ? 'Server submitted for review. It will appear once approved.'
        : 'Server submitted but could not be reached. An admin will review it.',
    };
  }

  async generateSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true, trim: true });
    let slug = `${base}-${nanoid()}`;
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.server.findUnique({ where: { slug } });
      if (!exists) break;
      slug = `${base}-${nanoid()}`;
    }
    return slug;
  }

  hashIp(ip: string): string {
    const salt = this.config.get<string>('IP_HASH_SALT', 'default-salt');
    return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  }
}
