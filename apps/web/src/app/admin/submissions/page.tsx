'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, Trash2, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminShell } from '../admin-shell';
import { apiClient } from '@/lib/api-client';

interface Submission {
  id: string;
  name: string;
  host: string;
  port: number;
  type: 'JAVA' | 'BEDROCK';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  contactEmail?: string;
  websiteUrl?: string;
  discordUrl?: string;
  notes?: string;
  createdAt: string;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDING');
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('admin_token') ?? '';
      const data = await apiClient.admin.listSubmissions(token, filter === 'ALL' ? undefined : filter);
      setSubmissions((data as { data: Submission[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    setActing(id);
    try {
      const token = sessionStorage.getItem('admin_token') ?? '';
      await apiClient.admin.approveSubmission(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string) {
    setActing(id);
    try {
      const token = sessionStorage.getItem('admin_token') ?? '';
      await apiClient.admin.rejectSubmission(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setActing(null);
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this submission permanently?')) return;
    setActing(id);
    try {
      const token = sessionStorage.getItem('admin_token') ?? '';
      await apiClient.admin.deleteSubmission(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setActing(null);
    }
  }

  const statusVariant: Record<string, 'default' | 'online' | 'offline' | 'unknown'> = {
    PENDING: 'unknown',
    APPROVED: 'online',
    REJECTED: 'offline',
    FAILED: 'offline',
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Submissions</h1>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="py-4"><div className="h-12 animate-pulse bg-secondary rounded" /></CardContent></Card>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">No {filter.toLowerCase()} submissions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{sub.name}</span>
                      <Badge variant={sub.type === 'JAVA' ? 'java' : 'bedrock'}>{sub.type}</Badge>
                      <Badge variant={statusVariant[sub.status] ?? 'unknown'}>{sub.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mb-1">
                      {sub.host}:{sub.port}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {sub.contactEmail && <span>{sub.contactEmail}</span>}
                      {sub.websiteUrl && <a href={sub.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{sub.websiteUrl}</a>}
                      <span>{new Date(sub.createdAt).toLocaleString()}</span>
                    </div>
                    {sub.notes && <p className="text-xs text-muted-foreground mt-1 italic">{sub.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {sub.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-green-400 border-green-400/30 hover:bg-green-400/10"
                          disabled={acting === sub.id}
                          onClick={() => approve(sub.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={acting === sub.id}
                          onClick={() => reject(sub.id)}
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      disabled={acting === sub.id}
                      onClick={() => del(sub.id)}
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
