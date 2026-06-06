'use client';
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Users, Zap, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { formatLatency } from '@/lib/utils';
import { useT } from '@/contexts/language-context';
import type { ServerDto } from '@minetracker/shared';

interface Props {
  slug: string;
  initial: ServerDto;
}

function useSecondsAgo(isoDate: string | null) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!isoDate) return;
    const tick = () => setSecs(Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isoDate]);

  return secs;
}

export function LiveStats({ slug, initial }: Props) {
  const t = useT();
  const { data } = useSWR(
    ['server-live', slug],
    () => apiClient.servers.get(slug),
    {
      fallbackData: initial,
      refreshInterval: 1_000,
      revalidateOnFocus: true,
    },
  );

  const server = data ?? initial;
  const isOnline = server.status === 'ONLINE';
  const secsAgo = useSecondsAgo(server.lastCheckedAt);

  const updatedLabel =
    secsAgo < 5 ? t.liveStats.updatedJustNow :
    secsAgo < 60 ? t.liveStats.updatedSecsAgo(secsAgo) :
    t.liveStats.updatedMinsAgo(Math.floor(secsAgo / 60));

  const statusLabel = isOnline
    ? t.liveStats.statusOnline
    : server.status === 'OFFLINE'
      ? t.liveStats.statusOffline
      : t.liveStats.statusUnknown;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
          <Badge variant={isOnline ? 'online' : server.status === 'OFFLINE' ? 'offline' : 'unknown'} className="text-xs">
            {statusLabel}
          </Badge>
          <span className="opacity-60">·</span>
          <span>{t.liveStats.updated} {updatedLabel}</span>
        </div>
        <span className="opacity-50 text-[10px] uppercase tracking-wider">{t.liveStats.liveRefresh}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-4 h-4 text-primary" />}
          label={t.liveStats.playersOnline}
          value={isOnline ? (
            <span>
              <span className="text-foreground">{server.playersOnline.toLocaleString()}</span>
              <span className="text-muted-foreground text-base font-normal">/{server.playersMax.toLocaleString()}</span>
            </span>
          ) : '—'}
          highlight={isOnline}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-yellow-400" />}
          label={t.liveStats.peakPlayers}
          value={<span>{server.peakPlayers.toLocaleString()}</span>}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          label={t.liveStats.uptime7d}
          value={<span>{server.uptimePercentage.toFixed(2)}%</span>}
        />
        <StatCard
          icon={<Zap className="w-4 h-4 text-orange-400" />}
          label={t.liveStats.latency}
          value={
            <span className={
              server.latencyMs === null ? '' :
              server.latencyMs < 50 ? 'text-green-400' :
              server.latencyMs < 150 ? 'text-yellow-400' : 'text-red-400'
            }>
              {formatLatency(server.latencyMs)}
            </span>
          }
        />
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary/30' : ''}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
