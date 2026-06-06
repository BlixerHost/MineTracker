import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
import * as net from 'net';

// All private/reserved CIDR ranges that must never be contacted
const BLOCKED_CIDRS = [
  { base: '0.0.0.0', bits: 8 },        // "This" network
  { base: '10.0.0.0', bits: 8 },       // Private class A
  { base: '100.64.0.0', bits: 10 },    // Shared address space (CGNAT)
  { base: '127.0.0.0', bits: 8 },      // Loopback
  { base: '169.254.0.0', bits: 16 },   // Link-local / AWS metadata
  { base: '172.16.0.0', bits: 12 },    // Private class B
  { base: '192.0.0.0', bits: 24 },     // IETF protocol
  { base: '192.168.0.0', bits: 16 },   // Private class C
  { base: '198.18.0.0', bits: 15 },    // Benchmarking
  { base: '198.51.100.0', bits: 24 },  // Documentation TEST-NET-2
  { base: '203.0.113.0', bits: 24 },   // Documentation TEST-NET-3
  { base: '224.0.0.0', bits: 4 },      // Multicast
  { base: '240.0.0.0', bits: 4 },      // Reserved
  { base: '255.255.255.255', bits: 32 },
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
]);

function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isInCidr(ip: string, cidr: { base: string; bits: number }): boolean {
  if (!net.isIPv4(ip)) return false;
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(cidr.base);
  const mask = cidr.bits === 32 ? 0xffffffff : ~(0xffffffff >>> cidr.bits);
  return (ipInt & mask) === (baseInt & mask);
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    // Block all IPv6 loopback and private ranges
    const normalized = ip.toLowerCase();
    if (normalized === '::1') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80')) return true;
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:1') return true;
    return false;
  }

  return BLOCKED_CIDRS.some((cidr) => isInCidr(ip, cidr));
}

@Injectable()
export class SsrfGuardService {
  /**
   * Validates that a host is safe to connect to.
   * Resolves DNS and checks all resulting IPs against blocked ranges.
   * Throws BadRequestException if the host is unsafe.
   */
  async validateHost(host: string): Promise<string[]> {
    const normalized = host.trim().toLowerCase();

    // Block known unsafe hostnames before DNS
    if (BLOCKED_HOSTNAMES.has(normalized)) {
      throw new BadRequestException('Invalid server host');
    }

    // If it looks like a raw IP — validate directly
    if (net.isIPv4(host) || net.isIPv6(host)) {
      if (isPrivateIp(host)) {
        throw new BadRequestException('Invalid server host');
      }
      return [host];
    }

    // Resolve hostname to IPs
    let addresses: string[];
    try {
      const result = await dns.resolve4(normalized).catch(() => []);
      const result6 = await dns.resolve6(normalized).catch(() => []);
      addresses = [...result, ...result6];
    } catch {
      throw new BadRequestException('Unable to resolve server host');
    }

    if (addresses.length === 0) {
      throw new BadRequestException('Unable to resolve server host');
    }

    // Every resolved IP must be public
    for (const ip of addresses) {
      if (isPrivateIp(ip)) {
        throw new BadRequestException('Invalid server host');
      }
    }

    return addresses;
  }

  /**
   * Validates a port number is in the valid Minecraft range.
   */
  validatePort(port: number): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new BadRequestException('Invalid port number');
    }
  }
}
