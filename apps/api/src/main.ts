import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  const config = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const isProd = config.get<string>('NODE_ENV') === 'production';
  const fastify = app.getHttpAdapter().getInstance();

  // ─── Security headers (Helmet) ────────────────────────────────────────────
  await fastify.register(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@fastify/helmet'),
    {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // kept for API responses (JSON only, no HTML)
          imgSrc: ["'self'", 'data:'],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      // HSTS: enforce HTTPS for 1 year in production
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Block clickjacking
      frameguard: { action: 'deny' },
      // Disable browser MIME sniffing
      noSniff: true,
      // Hide X-Powered-By
      hidePoweredBy: true,
    },
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const rawOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  await fastify.register(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@fastify/cors'),
    {
      origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
        // Allow requests with no origin (curl, mobile apps, server-to-server)
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`), false);
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
  );

  // ─── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── Global validation pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip unknown properties
      forbidNonWhitelisted: true, // 400 on unknown properties
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global exception filter ──────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  const port = config.get<number>('API_PORT', 3001);
  await app.listen(port, '0.0.0.0');

  logger.log(`MineTracker API running on port ${port} [${isProd ? 'production' : 'development'}]`, 'Bootstrap');
}

bootstrap();
