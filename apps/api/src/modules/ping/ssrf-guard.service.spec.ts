import { BadRequestException } from '@nestjs/common';
import { SsrfGuardService } from './ssrf-guard.service';

describe('SsrfGuardService', () => {
  let service: SsrfGuardService;

  beforeEach(() => {
    service = new SsrfGuardService();
  });

  describe('validatePort', () => {
    it('allows valid ports', () => {
      expect(() => service.validatePort(25565)).not.toThrow();
      expect(() => service.validatePort(19132)).not.toThrow();
      expect(() => service.validatePort(1)).not.toThrow();
      expect(() => service.validatePort(65535)).not.toThrow();
    });

    it('rejects port 0', () => {
      expect(() => service.validatePort(0)).toThrow(BadRequestException);
    });

    it('rejects port > 65535', () => {
      expect(() => service.validatePort(65536)).toThrow(BadRequestException);
    });

    it('rejects negative port', () => {
      expect(() => service.validatePort(-1)).toThrow(BadRequestException);
    });
  });

  describe('validateHost — raw IPs', () => {
    it('allows public IPs', async () => {
      await expect(service.validateHost('8.8.8.8')).resolves.toBeTruthy();
      await expect(service.validateHost('1.1.1.1')).resolves.toBeTruthy();
    });

    it('blocks localhost', async () => {
      await expect(service.validateHost('127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks 0.0.0.0', async () => {
      await expect(service.validateHost('0.0.0.0')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks private class A (10.x.x.x)', async () => {
      await expect(service.validateHost('10.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks private class B (172.16-31.x.x)', async () => {
      await expect(service.validateHost('172.16.0.1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateHost('172.31.255.255')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks private class C (192.168.x.x)', async () => {
      await expect(service.validateHost('192.168.1.1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks AWS metadata IP (169.254.169.254)', async () => {
      await expect(service.validateHost('169.254.169.254')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks IPv6 loopback (::1)', async () => {
      await expect(service.validateHost('::1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateHost — hostnames', () => {
    it('blocks "localhost"', async () => {
      await expect(service.validateHost('localhost')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks AWS metadata hostname', async () => {
      await expect(
        service.validateHost('metadata.google.internal'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
