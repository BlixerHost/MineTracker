import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import * as dgram from 'dgram';

export interface PingResult {
  online: boolean;
  playersOnline: number;
  playersMax: number;
  version: string | null;
  motd: string | null;
  favicon: string | null;
  latencyMs: number;
  error: string | null;
}

@Injectable()
export class PingService {
  private readonly logger = new Logger(PingService.name);
  private readonly timeoutMs: number;

  constructor(private config: ConfigService) {
    this.timeoutMs = config.get<number>('PING_TIMEOUT_MS', 5000);
  }

  async ping(host: string, port: number, type: 'JAVA' | 'BEDROCK'): Promise<PingResult> {
    return type === 'JAVA' ? this.pingJava(host, port) : this.pingBedrock(host, port);
  }

  // ─── Java Edition ─────────────────────────────────────────────────────────

  private async pingJava(host: string, port: number): Promise<PingResult> {
    const start = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      let receivedData = Buffer.alloc(0);

      const fail = (error: string) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve({ online: false, playersOnline: 0, playersMax: 0, version: null, motd: null, favicon: null, latencyMs: Date.now() - start, error });
      };

      socket.setTimeout(this.timeoutMs);
      socket.on('timeout', () => fail('Connection timed out'));
      socket.on('error', (err) => fail(err.message));

      socket.on('data', (chunk) => {
        receivedData = Buffer.concat([receivedData, chunk]);
        try {
          const result = this.parseJavaResponse(receivedData, start);
          if (result) { resolved = true; socket.destroy(); resolve(result); }
        } catch (err) {
          fail(err instanceof Error ? err.message : 'Parse error');
        }
      });

      socket.connect(port, host, () => {
        socket.write(this.buildJavaHandshake(host, port));
        socket.write(Buffer.from([0x01, 0x00]));
      });
    });
  }

  private buildJavaHandshake(host: string, port: number): Buffer {
    const hostBytes = Buffer.from(host, 'utf8');
    const data = Buffer.concat([
      Buffer.from([0x00]),
      this.writeVarInt(764),
      this.writeVarInt(hostBytes.length),
      hostBytes,
      this.writeUInt16BE(port),
      this.writeVarInt(1),
    ]);
    return Buffer.concat([this.writeVarInt(data.length), data]);
  }

  private parseJavaResponse(data: Buffer, start: number): PingResult | null {
    if (data.length < 5) return null;
    let offset = 0;
    const { value: packetLength, bytesRead: l1 } = this.readVarInt(data, offset); offset += l1;
    if (data.length < offset + packetLength) return null;
    const { value: packetId, bytesRead: l2 } = this.readVarInt(data, offset); offset += l2;
    if (packetId !== 0x00) return null;
    const { value: jsonLength, bytesRead: l3 } = this.readVarInt(data, offset); offset += l3;
    if (data.length < offset + jsonLength) return null;
    const payload = JSON.parse(data.toString('utf8', offset, offset + jsonLength)) as JavaStatusResponse;
    return {
      online: true,
      playersOnline: payload.players?.online ?? 0,
      playersMax: payload.players?.max ?? 0,
      version: payload.version?.name ?? null,
      motd: this.parseMotd(payload.description),
      favicon: payload.favicon ?? null,
      latencyMs: Date.now() - start,
      error: null,
    };
  }

  private parseMotd(description: unknown): string {
    if (!description) return '';
    if (typeof description === 'string') return description;
    if (typeof description === 'object' && description !== null) {
      const obj = description as { text?: string; extra?: Array<{ text?: string }> };
      return (obj.text ?? '') + (obj.extra?.map((e) => e.text ?? '').join('') ?? '');
    }
    return '';
  }

  // ─── Bedrock Edition ──────────────────────────────────────────────────────

  private async pingBedrock(host: string, port: number): Promise<PingResult> {
    const start = Date.now();
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      let resolved = false;
      let timer: ReturnType<typeof setTimeout>;

      const fail = (error: string) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        socket.close();
        resolve({ online: false, playersOnline: 0, playersMax: 0, version: null, motd: null, favicon: null, latencyMs: Date.now() - start, error });
      };

      timer = setTimeout(() => fail('Connection timed out'), this.timeoutMs);
      socket.on('error', (err) => fail(err.message));

      socket.on('message', (msg) => {
        try {
          const result = this.parseBedrockResponse(msg, start);
          if (result) { resolved = true; clearTimeout(timer); socket.close(); resolve(result); }
        } catch (err) {
          fail(err instanceof Error ? err.message : 'Parse error');
        }
      });

      const ping = this.buildBedrockPing();
      socket.send(ping, port, host, (err) => { if (err) fail(err.message); });
    });
  }

  private buildBedrockPing(): Buffer {
    const buf = Buffer.alloc(33);
    buf.writeUInt8(0x01, 0);
    buf.writeBigInt64BE(BigInt(Date.now()), 1);
    Buffer.from('00ffff00fefefefefdfdfdfd12345678', 'hex').copy(buf, 9);
    buf.writeBigInt64BE(BigInt(0), 25);
    return buf;
  }

  private parseBedrockResponse(msg: Buffer, start: number): PingResult | null {
    if (msg.length < 35 || msg.readUInt8(0) !== 0x1c) return null;
    const strLen = msg.readUInt16BE(33);
    if (msg.length < 35 + strLen) return null;
    const motdRaw = msg.toString('utf8', 35, 35 + strLen);
    const parts = motdRaw.split(';');
    if (parts.length < 6) return null;
    return {
      online: true,
      playersOnline: parseInt(parts[4] ?? '0', 10) || 0,
      playersMax: parseInt(parts[5] ?? '0', 10) || 0,
      version: parts[3] ?? null,
      motd: parts[1] ?? null,
      favicon: null,
      latencyMs: Date.now() - start,
      error: null,
    };
  }

  // ─── VarInt helpers ───────────────────────────────────────────────────────

  private writeVarInt(value: number): Buffer {
    const bytes: number[] = [];
    let v = value;
    do {
      let byte = v & 0x7f;
      v >>>= 7;
      if (v !== 0) byte |= 0x80;
      bytes.push(byte);
    } while (v !== 0);
    return Buffer.from(bytes);
  }

  private readVarInt(buf: Buffer, offset: number): { value: number; bytesRead: number } {
    let value = 0, bytesRead = 0, byte: number;
    do {
      if (offset + bytesRead >= buf.length) throw new Error('Buffer too short for VarInt');
      byte = buf.readUInt8(offset + bytesRead);
      value |= (byte & 0x7f) << (7 * bytesRead);
      bytesRead++;
      if (bytesRead > 5) throw new Error('VarInt too long');
    } while ((byte & 0x80) !== 0);
    return { value, bytesRead };
  }

  private writeUInt16BE(value: number): Buffer {
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(value);
    return buf;
  }
}

interface JavaStatusResponse {
  version?: { name?: string; protocol?: number };
  players?: { online?: number; max?: number };
  description?: unknown;
  favicon?: string;
}
