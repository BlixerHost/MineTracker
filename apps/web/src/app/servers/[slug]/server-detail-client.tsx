'use client';
import Link from 'next/link';
import { Globe, MessageSquare, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { useT } from '@/contexts/language-context';
import type { ServerDto } from '@minetracker/shared';

interface Props {
  server: ServerDto;
  address: string;
  motdClean: string | null;
}

export function ServerDetailHeader({ server, address, motdClean }: Props) {
  const t = useT();

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/"><ChevronLeft className="w-4 h-4" />{t.serverDetail.backToAll}</Link>
      </Button>

      <div className="flex items-start gap-4 mb-6">
        {server.faviconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={server.faviconUrl} alt={`${server.name} icon`} width={72} height={72} className="rounded-xl w-16 h-16 flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-3xl flex-shrink-0">⛏️</div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{server.name}</h1>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <code className="font-mono bg-secondary px-2 py-0.5 rounded text-xs">{address}</code>
            <CopyButton text={address} />
          </div>

          {motdClean && (
            <p className="text-xs text-muted-foreground mt-2 opacity-70 font-mono">{motdClean}</p>
          )}
        </div>
      </div>
    </>
  );
}

export function ServerInfoCard({ server }: { server: ServerDto }) {
  const t = useT();

  return (
    <Card className="mb-6">
      <CardContent className="pt-5">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: t.serverDetail.country, value: server.country ?? t.serverDetail.unknown },
            { label: t.serverDetail.added, value: new Date(server.createdAt).toLocaleDateString() },
            { label: t.serverDetail.approved, value: server.approvedAt ? new Date(server.approvedAt).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="text-foreground font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {(server.websiteUrl || server.discordUrl) && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-border">
            {server.websiteUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={server.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-3.5 h-3.5" />{t.serverDetail.website}
                </a>
              </Button>
            )}
            {server.discordUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={server.discordUrl} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="w-3.5 h-3.5" />{t.serverDetail.discord}
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
