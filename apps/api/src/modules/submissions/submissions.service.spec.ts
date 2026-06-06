import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import type { SubmitServerDto } from './dto/submit-server.dto';

// Minimal mocks
const mockPrisma = {
  serverSubmission: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  server: {
    findFirst: jest.fn(),
  },
};

const mockRedis = {
  checkSubmitRateLimit: jest.fn(),
};

const mockSsrfGuard = {
  validateHost: jest.fn(),
  validatePort: jest.fn(),
};

const mockPingService = {
  ping: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, def?: unknown) => {
    const values: Record<string, unknown> = {
      ENABLE_SERVER_SUBMISSIONS: true,
      SUBMISSION_RATE_LIMIT_PER_HOUR: 5,
      IP_HASH_SALT: 'test-salt-value-16chars',
    };
    return values[key] ?? def;
  }),
};

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SubmissionsService(
      mockPrisma as any,
      mockRedis as any,
      mockSsrfGuard as any,
      mockPingService as any,
      mockConfig as any,
    );

    // Default: rate limit OK, no duplicates, ping OK
    mockRedis.checkSubmitRateLimit.mockResolvedValue({ allowed: true, remaining: 4 });
    mockSsrfGuard.validateHost.mockResolvedValue(['1.2.3.4']);
    mockSsrfGuard.validatePort.mockReturnValue(undefined);
    mockPrisma.serverSubmission.findFirst.mockResolvedValue(null);
    mockPrisma.server.findFirst.mockResolvedValue(null);
    mockPingService.ping.mockResolvedValue({
      online: true, playersOnline: 50, playersMax: 100,
      version: '1.20', motd: 'Test', favicon: null,
      latencyMs: 50, error: null,
    });
    mockPrisma.serverSubmission.create.mockResolvedValue({ id: 1 });
  });

  const validDto: SubmitServerDto = {
    name: 'Test Server',
    host: 'play.testserver.net',
    port: 25565,
    type: 'JAVA',
  };

  it('creates a PENDING submission when server is reachable', async () => {
    const result = await service.submit(validDto, '1.2.3.4');
    expect(result.message).toContain('submitted for review');
    expect(mockPrisma.serverSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
  });

  it('creates a FAILED submission when server is unreachable', async () => {
    mockPingService.ping.mockResolvedValue({
      online: false, playersOnline: 0, playersMax: 0,
      version: null, motd: null, favicon: null,
      latencyMs: 5000, error: 'Timed out',
    });

    const result = await service.submit(validDto, '1.2.3.4');
    expect(result.message).toContain('could not be reached');
    expect(mockPrisma.serverSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('throws BadRequestException when rate limited', async () => {
    mockRedis.checkSubmitRateLimit.mockResolvedValue({ allowed: false, remaining: 0 });
    await expect(service.submit(validDto, '1.2.3.4')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws ConflictException for duplicate pending submission', async () => {
    mockPrisma.serverSubmission.findFirst.mockResolvedValue({ id: 99 });
    await expect(service.submit(validDto, '1.2.3.4')).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws ConflictException for already-approved server', async () => {
    mockPrisma.server.findFirst.mockResolvedValue({ id: 10 });
    await expect(service.submit(validDto, '1.2.3.4')).rejects.toThrow(
      ConflictException,
    );
  });

  it('silently accepts honeypot submission without creating record', async () => {
    const result = await service.submit(
      { ...validDto, website: 'http://spam.com' } as any,
      '1.2.3.4',
    );
    expect(result.message).toBe('Submission received');
    expect(mockPrisma.serverSubmission.create).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when submissions are disabled', async () => {
    mockConfig.get.mockImplementation((key: string, def?: unknown) => {
      if (key === 'ENABLE_SERVER_SUBMISSIONS') return false;
      return def;
    });

    await expect(service.submit(validDto, '1.2.3.4')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
