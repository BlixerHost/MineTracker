'use client';
import useSWR from 'swr';
import { Users } from 'lucide-react';
import { useT } from '@/contexts/language-context';

interface GlobalStats {
  playersOnline: number;
  serversOnline: number;
  totalServers: number;
}

const fetcher = async (): Promise<GlobalStats> => {
  const r = await fetch('/api/servers/global-stats');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<GlobalStats>;
};

export function GlobalStats() {
  const t = useT();
  const { data, isValidating } = useSWR<GlobalStats>('global-stats', fetcher, {
    refreshInterval: 1_000,
    revalidateOnFocus: true,
  });

  if (!data) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isValidating ? 'bg-green-300 animate-ping' : 'bg-green-400 animate-pulse'}`} />
      <Users className="w-3.5 h-3.5" />
      <span className="tabular-nums font-medium text-foreground transition-all">
        {data.playersOnline.toLocaleString()}
      </span>
      <span className="hidden sm:inline">{t.globalStats.playersOnline}</span>
    </div>
  );
}
