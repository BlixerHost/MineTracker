import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis — optional in development
  REDIS_URL: z.string().default(''),

  // Auth
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  // App
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),

  // Submissions
  ENABLE_SERVER_SUBMISSIONS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  SUBMISSION_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).default(5),
  REQUIRE_ADMIN_APPROVAL: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Worker
  PING_INTERVAL_SECONDS: z.coerce.number().int().min(10).default(10),
  PING_CONCURRENCY: z.coerce.number().int().min(1).max(200).default(50),
  PING_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5000),

  // Security
  IP_HASH_SALT: z
    .string()
    .min(16, 'IP_HASH_SALT must be at least 16 characters'),

  // Admin seed (optional at runtime, required for seed script)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  const data = result.data;

  // ─── Production-only strict checks ───────────────────────────────────────
  if (data.NODE_ENV === 'production') {
    const errors: string[] = [];

    if (data.JWT_SECRET.length < 64)
      errors.push('JWT_SECRET must be at least 64 characters in production');

    if (data.IP_HASH_SALT.length < 32)
      errors.push('IP_HASH_SALT must be at least 32 characters in production');

    if (data.CORS_ORIGINS === 'http://localhost:3000')
      errors.push('CORS_ORIGINS must not be localhost in production');

    if (data.DATABASE_URL.startsWith('file:'))
      errors.push(
        'SQLite (file:) is not recommended for production. Set DATABASE_URL to a MySQL/PostgreSQL connection string, or set NODE_ENV=development to bypass.',
      );

    if (errors.length > 0)
      throw new Error(`Production env check failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }

  return data;
}
