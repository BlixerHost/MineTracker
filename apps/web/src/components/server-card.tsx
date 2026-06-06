'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, WifiOff, Users, Globe, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatLatency, stripMotdColors, copyToClipboard } from '@/lib/utils';
import { useT } from '@/contexts/language-context';
import type { ServerCardDto } from '@minetracker/shared';

interface ServerCardProps {
  server: ServerCardDto;
  rank?: number;
}

export function ServerCard({ server, rank }: ServerCardProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const address = server.port === 25565 || server.port === 19132 ? server.host : `${server.host}:${server.port}`;
    await copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOnline = server.status === 'ONLINE';
  const motdClean = stripMotdColors(server.motd);

  return (
    <Link href={`/servers/${server.slug}`} className="block group">
      <div className={cn(
        'relative rounded-xl border bg-card p-4 transition-all duration-200',
        'hover:border-primary/50 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5',
        'border-border',
      )}>
        {rank && (
          <div className={cn(
            'absolute -top-2 -left-2 min-w-[24px] h-6 px-1 rounded-full flex items-center justify-center text-xs font-bold',
            rank === 1 && 'bg-yellow-500 text-yellow-900',
            rank === 2 && 'bg-gray-400 text-gray-900',
            rank === 3 && 'bg-amber-600 text-amber-100',
            rank > 3 && 'bg-secondary text-muted-foreground',
          )}>
            {rank}
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Favicon */}
          <div className="flex-shrink-0">
            {server.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={server.faviconUrl}
                alt={`${server.name} icon`}
                width={48}
                height={48}
                className="rounded-lg w-12 h-12 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-xl">
                ⛏️
              </div>
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {server.name}
              </h3>
              <Badge variant={server.type === 'JAVA' ? 'java' : 'bedrock'}>
                {server.type}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
              {server.host}{server.port !== 25565 && server.port !== 19132 ? `:${server.port}` : ''}
            </p>

            {motdClean && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-70">
                {motdClean}
              </p>
            )}
          </div>

          {/* Players */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              {isOnline ? (
                <span className="font-bold text-foreground tabular-nums">
                  {server.playersOnline.toLocaleString()}
                  <span className="text-muted-foreground font-normal text-xs">/{server.playersMax.toLocaleString()}</span>
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">{t.serverList.offline}</span>
              )}
            </div>

            {server.latencyMs !== null && isOnline && (
              <div className="flex items-center gap-1 text-xs">
                <Zap className="w-3 h-3 text-muted-foreground" />
                <span className={cn(
                  server.latencyMs < 50 ? 'text-green-400' :
                  server.latencyMs < 150 ? 'text-yellow-400' : 'text-red-400',
                )}>
                  {formatLatency(server.latencyMs)}
                </span>
              </div>
            )}

            {server.version && (
              <span className="text-[10px] text-muted-foreground opacity-70 max-w-[100px] truncate text-right">
                {server.version}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {server.country && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {server.country}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {t.serverCard.peak} {server.peakPlayers.toLocaleString()}
            </span>
            <span>{Number(server.uptimePercentage).toFixed(1)}% {t.serverCard.uptime}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? t.serverCard.copied : t.serverCard.copyIp}
          </Button>
        </div>
      </div>
    </Link>
  );
}

export function ServerCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-secondary rounded w-1/3" />
          <div className="h-3 bg-secondary rounded w-1/4" />
          <div className="h-3 bg-secondary rounded w-2/3" />
        </div>
        <div className="space-y-1">
          <div className="h-4 bg-secondary rounded w-16" />
          <div className="h-3 bg-secondary rounded w-12" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex justify-between">
        <div className="h-3 bg-secondary rounded w-1/3" />
        <div className="h-6 bg-secondary rounded w-16" />
      </div>
    </div>
  );
}
