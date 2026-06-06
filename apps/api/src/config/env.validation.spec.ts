import { validateEnv } from './env.validation';

const baseEnv = {
  DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-characters-long',
  IP_HASH_SALT: 'at-least-16-chars-salt',
};

describe('validateEnv', () => {
  it('accepts valid env with defaults', () => {
    const result = validateEnv(baseEnv);
    expect(result.NODE_ENV).toBe('development');
    expect(result.API_PORT).toBe(3001);
    expect(result.PING_INTERVAL_SECONDS).toBe(60);
    expect(result.PING_CONCURRENCY).toBe(10);
  });

  it('throws if DATABASE_URL is missing', () => {
    const { DATABASE_URL: _, ...rest } = baseEnv;
    expect(() => validateEnv(rest)).toThrow();
  });

  it('throws if JWT_SECRET is too short', () => {
    expect(() =>
      validateEnv({ ...baseEnv, JWT_SECRET: 'short' }),
    ).toThrow();
  });

  it('throws if IP_HASH_SALT is too short', () => {
    expect(() =>
      validateEnv({ ...baseEnv, IP_HASH_SALT: 'tiny' }),
    ).toThrow();
  });

  it('coerces API_PORT to number', () => {
    const result = validateEnv({ ...baseEnv, API_PORT: '4000' });
    expect(result.API_PORT).toBe(4000);
    expect(typeof result.API_PORT).toBe('number');
  });

  it('coerces ENABLE_SERVER_SUBMISSIONS to boolean', () => {
    expect(
      validateEnv({ ...baseEnv, ENABLE_SERVER_SUBMISSIONS: 'true' })
        .ENABLE_SERVER_SUBMISSIONS,
    ).toBe(true);

    expect(
      validateEnv({ ...baseEnv, ENABLE_SERVER_SUBMISSIONS: 'false' })
        .ENABLE_SERVER_SUBMISSIONS,
    ).toBe(false);
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() =>
      validateEnv({ ...baseEnv, NODE_ENV: 'staging' }),
    ).toThrow();
  });
});
