import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { validateEnv } from './config/env.validation';
import { winstonConfig } from './config/winston.config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ServersModule } from './modules/servers/servers.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { PingModule } from './modules/ping/ping.module';
import { WorkerModule } from './modules/worker/worker.module';
import { StatsModule } from './modules/stats/stats.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Config — carga y valida todas las env vars al arrancar
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logger estructurado global
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: winstonConfig,
    }),

    // Rate limiting global (throttler)
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1_000,  limit: 20  },  // 20 req/s  per IP
      { name: 'medium', ttl: 60_000, limit: 300 },  // 300 req/min per IP
    ]),

    // Cron jobs (@Cron)
    ScheduleModule.forRoot(),

    PrismaModule,
    RedisModule,
    PingModule,
    ServersModule,
    SubmissionsModule,
    AuthModule,
    AdminModule,
    WorkerModule,
    StatsModule,
    HealthModule,
  ],
})
export class AppModule {}
