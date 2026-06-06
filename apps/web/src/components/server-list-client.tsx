'use client';
import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServerCard, ServerCardSkeleton } from '@/components/server-card';
import { apiClient } from '@/lib/api-client';
import { useT } from '@/contexts/language-context';
import type { PaginatedResponse, ServerCardDto, ServerFilters } from '@minetracker/shared';

interface Props {
  initialData: PaginatedResponse<ServerCardDto>;
}

const fetcher = (filters: ServerFilters) => apiClient.servers.list(filters);

export function ServerListClient({ initialData }: Props) {
  const t = useT();
  const [filters, setFilters] = useState<ServerFilters>({
    page: 1, limit: 20, sort: 'players_online', order: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isValidating } = useSWR(
    ['servers', filters],
    () => fetcher(filters),
    {
      fallbackData: filters.page === 1 && !filters.search && !filters.type && !filters.status
        ? initialData : undefined,
      refreshInterval: 1_000,
      keepPreviousData: true,
    },
  );

  const updateFilter = useCallback((key: keyof ServerFilters, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput || undefined);
  }, [searchInput, updateFilter]);

  const servers = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t.serverList.searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">{t.serverList.search}</Button>
        </form>

        <div className="flex gap-2">
          <Select
            value={filters.type ?? 'all'}
            onValueChange={(v) => updateFilter('type', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t.serverList.allEditions} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.serverList.allEditions}</SelectItem>
              <SelectItem value="JAVA">Java</SelectItem>
              <SelectItem value="BEDROCK">Bedrock</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t.serverList.allStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.serverList.allStatus}</SelectItem>
              <SelectItem value="ONLINE">{t.serverList.online}</SelectItem>
              <SelectItem value="OFFLINE">{t.serverList.offline}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sort ?? 'players_online'}
            onValueChange={(v) => updateFilter('sort', v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="players_online">{t.serverList.sortPlayers}</SelectItem>
              <SelectItem value="name">{t.serverList.sortName}</SelectItem>
              <SelectItem value="uptime">{t.serverList.sortUptime}</SelectItem>
              <SelectItem value="created_at">{t.serverList.sortNewest}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats bar */}
      {meta && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t.serverList.serverCount(meta.total)}
            {filters.search && t.serverList.matching(filters.search)}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isValidating ? 'bg-green-400 animate-pulse' : 'bg-green-400/40'}`} />
              <span className="text-xs">{t.serverList.live}</span>
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>{t.serverList.page(meta.page, meta.totalPages)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Server list */}
      <div className="space-y-2.5">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <ServerCardSkeleton key={i} />)
          : servers.length === 0
            ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-lg font-medium">{t.serverList.noServers}</p>
                <p className="text-sm mt-1">{t.serverList.noServersHint}</p>
              </div>
            )
            : servers.map((server, index) => (
              <ServerCard
                key={server.id}
                server={server}
                rank={filters.sort === 'players_online'
                  ? ((filters.page ?? 1) - 1) * (filters.limit ?? 20) + index + 1
                  : undefined}
              />
            ))
        }
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
          >
            <ChevronLeft className="w-4 h-4" />
            {t.serverList.prev}
          </Button>

          <span className="text-sm text-muted-foreground px-2">
            {meta.page} / {meta.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
          >
            {t.serverList.next}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
