export type ServerType = 'JAVA' | 'BEDROCK';
export type ServerStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';

export interface ServerDto {
  id: number;
  name: string;
  slug: string;
  host: string;
  port: number;
  type: ServerType;
  status: ServerStatus;
  motd: string | null;
  version: string | null;
  faviconUrl: string | null;
  playersOnline: number;
  playersMax: number;
  peakPlayers: number;
  latencyMs: number | null;
  uptimePercentage: number;
  country: string | null;
  websiteUrl: string | null;
  discordUrl: string | null;
  approvedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface ServerCardDto extends Pick<
  ServerDto,
  | 'id'
  | 'name'
  | 'slug'
  | 'host'
  | 'port'
  | 'type'
  | 'status'
  | 'motd'
  | 'version'
  | 'faviconUrl'
  | 'playersOnline'
  | 'playersMax'
  | 'peakPlayers'
  | 'latencyMs'
  | 'country'
  | 'uptimePercentage'
  | 'lastCheckedAt'
> {}

export interface ServerSnapshotDto {
  id: number;
  serverId: number;
  checkedAt: string;
  online: boolean;
  playersOnline: number;
  playersMax: number;
  version: string | null;
  latencyMs: number | null;
}

export interface ServerDailyStatsDto {
  id: number;
  serverId: number;
  date: string;
  avgPlayers: number;
  maxPlayers: number;
  minPlayers: number;
  uptimePercentage: number;
  checksCount: number;
  onlineChecks: number;
}

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
