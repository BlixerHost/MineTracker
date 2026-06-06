'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AdminShell } from '../admin-shell';
import { apiClient } from '@/lib/api-client';
import { formatNumber } from '@/lib/utils';

interface AdminServer {
  id: string;
  name: string;
  host: string;
  port: number;
  type: 'JAVA' | 'BEDROCK';
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  playersOnline: number;
  playersMax: number;
  version?: string;
  country?: string;
  lastCheckedAt?: string;
  slug: string;
}

export default function AdminServersPage() {
  const [servers, setServers] = useState<AdminServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('admin_token') ?? '';
      const data = await apiClient.admin.listServers(token);
      setServers((data as { data: AdminServer[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function recheck(id: string) {
    setActing(id);
    try {
      const token = sessionStorage.getItem('admin_token') ?? '';
      await apiClient.admin.recheckServer(token, id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to recheck');
    } finally {
      setActing(null);
    }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete "${name}" permanently? This removes all snapshots.`)) return;
    setActing(id);
    try {
      const token = sessionStorage.getItem('admin_token') ?? '';
      await apiClient.admin.deleteServer(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setActing(null);
    }
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Servers ({servers.length})</h1>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="py-4"><div className="h-12 animate-pulse bg-secondary rounded" /></CardContent></Card>
          ))}
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🗃️</p>
          <p className="font-medium">No servers yet</p>
          <p className="text-sm mt-1">Approve a submission to add servers.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {servers.map((srv) => (
            <Card key={srv.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`/servers/${srv.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-primary transition-colors"
                        >
                          {srv.name}
                        </a>
                        <Badge variant={srv.type === 'JAVA' ? 'java' : 'bedrock'}>{srv.type}</Badge>
                        <Badge variant={srv.status === 'ONLINE' ? 'online' : srv.status === 'OFFLINE' ? 'offline' : 'unknown'}>
                          {srv.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{srv.host}:{srv.port}</span>
                        {srv.status === 'ONLINE' && (
                          <span>{formatNumber(srv.playersOnline)}/{formatNumber(srv.playersMax)} players</span>
                        )}
                        {srv.version && <span>{srv.version}</span>}
                        {srv.country && <span>{srv.country}</span>}
                        {srv.lastCheckedAt && (
                          <span>Checked {new Date(srv.lastCheckedAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      disabled={acting === srv.id}
                      onClick={() => recheck(srv.id)}
                      title="Force re-ping now"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Recheck
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      disabled={acting === srv.id}
                      onClick={() => del(srv.id, srv.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
