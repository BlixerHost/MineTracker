'use client';
import React, { useEffect, useState } from 'react';
import { Users, Server, FileText, CheckCircle2, TrendingUp, Activity, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AdminShell } from './admin-shell';
import { apiClient } from '@/lib/api-client';

interface DashboardStats {
  totalServers: number;
  onlineServers: number;
  pendingSubmissions: number;
  totalSubmissions: number;
  peakServersOnline: number;
  peakPlayersTotal: number;
  peakPlayersSingleServer: number;
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent?: 'green' | 'yellow' | 'blue' | 'purple' | 'orange';
}) {
  const accentBg: Record<string, string> = {
    green: 'bg-green-500/10',
    yellow: 'bg-yellow-500/10',
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    orange: 'bg-orange-500/10',
  };

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accent ? accentBg[accent] : 'bg-secondary'}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-xs text-primary mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token') ?? '';
    const load = () =>
      apiClient.admin.getStats(token)
        .then((s) => setStats(s as unknown as DashboardStats))
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stats'));

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  const skeletonGrid = (cols: number) => (
    <div className={`grid grid-cols-2 lg:grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-5 pb-5">
            <div className="h-14 animate-pulse bg-secondary rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AdminShell>
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {stats ? (
        <div className="space-y-4">
          {/* Row 1 — current state */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Server className="w-4 h-4 text-primary" />}
              label="Total servers"
              value={stats.totalServers}
              accent="blue"
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
              label="Online now"
              value={stats.onlineServers}
              sub={stats.totalServers > 0 ? `${Math.round((stats.onlineServers / stats.totalServers) * 100)}% of total` : undefined}
              accent="green"
            />
            <StatCard
              icon={<FileText className="w-4 h-4 text-yellow-400" />}
              label="Pending review"
              value={stats.pendingSubmissions}
              accent="yellow"
            />
            <StatCard
              icon={<Users className="w-4 h-4 text-blue-400" />}
              label="Total submissions"
              value={stats.totalSubmissions}
              accent="blue"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All-time records</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Row 2 — all-time peaks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Activity className="w-4 h-4 text-purple-400" />}
              label="Peak servers online (simultaneous)"
              value={stats.peakServersOnline}
              sub="Most servers online at once"
              accent="purple"
            />
            <StatCard
              icon={<Users className="w-4 h-4 text-orange-400" />}
              label="Peak total players"
              value={stats.peakPlayersTotal}
              sub="Most players across all servers"
              accent="orange"
            />
            <StatCard
              icon={<Zap className="w-4 h-4 text-yellow-400" />}
              label="Peak players (single server)"
              value={stats.peakPlayersSingleServer}
              sub="All-time record on one server"
              accent="yellow"
            />
          </div>
        </div>
      ) : !error ? (
        <div className="space-y-4">
          {skeletonGrid(4)}
          {skeletonGrid(3)}
        </div>
      ) : null}
    </AdminShell>
  );
}
