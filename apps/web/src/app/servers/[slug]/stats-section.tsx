'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServerChart } from '@/components/server-chart';
import { apiClient } from '@/lib/api-client';
import { useT } from '@/contexts/language-context';
import type { StatsRange } from '@minetracker/shared';

const RANGE_VALUES: StatsRange[] = ['24h', '7d', '30d', 'all'];

export function StatsSection({ slug }: { slug: string }) {
  const t = useT();
  const [range, setRange] = useState<StatsRange>('24h');

  const { data, isLoading } = useSWR(
    ['server-stats', slug, range],
    () => apiClient.servers.stats(slug, range),
    { refreshInterval: 60_000 },
  );

  const rangeLabel = (r: StatsRange) => r === 'all' ? t.statsSection.allTime : r;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t.statsSection.playerHistory}</CardTitle>
          <div className="flex gap-1">
            {RANGE_VALUES.map((r) => (
              <Button
                key={r}
                variant={range === r ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setRange(r)}
              >
                {rangeLabel(r)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 bg-secondary rounded-lg animate-pulse" />
        ) : !data || (data as unknown[]).length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            {t.statsSection.noData}
          </div>
        ) : (
          <ServerChart data={data as Parameters<typeof ServerChart>[0]['data']} range={range} />
        )}
      </CardContent>
    </Card>
  );
}
