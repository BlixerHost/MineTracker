import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: number;
  email: string;
}

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    // ── Brute-force protection ──────────────────────────────────────────────
    const key = `login:fail:${crypto.createHash('sha256').update(dto.email.toLowerCase()).digest('hex').slice(0, 16)}`;

    if (this.redis.available) {
      const attempts = await this.redis.getClient().get(key);
      if (Number(attempts) >= MAX_ATTEMPTS) {
        this.logger.warn(`Login blocked (rate limit) for: ${dto.email}`);
        throw new HttpException('Too many failed login attempts. Try again in 15 minutes.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    // ── Credential check ────────────────────────────────────────────────────
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    // Constant-time comparison even when admin doesn't exist
    const dummyHash = '$2b$12$invalidhashfortimingreasonsoattackerscannotdeterminevalid';
    const hash = admin?.passwordHash ?? dummyHash;
    const valid = await bcrypt.compare(dto.password, hash);

    if (!admin || !valid) {
      this.logger.warn(`Failed login attempt for: ${dto.email}`);

      if (this.redis.available) {
        const count = await this.redis.getClient().incr(key);
        if (count === 1) await this.redis.getClient().expire(key, WINDOW_SECONDS);
        const remaining = Math.max(0, MAX_ATTEMPTS - count);
        this.logger.warn(`  → ${count}/${MAX_ATTEMPTS} attempts (${remaining} left before lockout)`);
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // ── Success: reset counter ───────────────────────────────────────────────
    if (this.redis.available) await this.redis.getClient().del(key);

    const payload: JwtPayload = { sub: admin.id, email: admin.email };
    const access_token = this.jwtService.sign(payload);

    this.logger.log(`Admin logged in: ${admin.email}`);
    return { access_token };
  }

  async validatePayload(payload: JwtPayload) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    return admin;
  }
}
