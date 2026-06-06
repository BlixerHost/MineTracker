import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { StatsSection } from './stats-section';
import { LiveStats } from './live-stats';
import { ServerDetailHeader, ServerInfoCard } from './server-detail-client';
import { stripMotdColors } from '@/lib/utils';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const server = await apiClient.servers.get(slug);
    const status = server.status === 'ONLINE'
      ? `Online — ${server.playersOnline.toLocaleString()}/${server.playersMax.toLocaleString()} players`
      : 'Offline';
    return {
      title: server.name,
      description: `${server.name} Minecraft server. ${status}. Version: ${server.version ?? 'Unknown'}. Uptime: ${server.uptimePercentage.toFixed(1)}%.`,
      openGraph: {
        title: `${server.name} | MineTracker`,
        description: `Track ${server.name} — ${status}`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Server not found' };
  }
}

export default async function ServerPage({ params }: Props) {
  const { slug } = await params;

  let server;
  try {
    server = await apiClient.servers.get(slug);
  } catch {
    notFound();
  }

  const address = server.port === 25565 || server.port === 19132
    ? server.host : `${server.host}:${server.port}`;
  const motdClean = stripMotdColors(server.motd);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ServerDetailHeader server={server} address={address} motdClean={motdClean} />

      {/* Edition + version badges (static, no translation needed) */}
      <div className="flex items-center flex-wrap gap-2 mb-6 -mt-4">
        <Badge variant={server.type === 'JAVA' ? 'java' : 'bedrock'}>{server.type}</Badge>
        {server.version && (
          <span className="text-xs text-muted-foreground">{server.version}</span>
        )}
      </div>

      {/* Live stats */}
      <div className="mb-6">
        <LiveStats slug={slug} initial={server} />
      </div>

      <ServerInfoCard server={server} />

      <StatsSection slug={slug} />
    </div>
  );
}
