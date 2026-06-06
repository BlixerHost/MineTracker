import type { MetadataRoute } from 'next';
import { apiClient } from '@/lib/api-client';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://minetracker.gg';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'always', priority: 1.0 },
    { url: `${base}/submit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const res = await apiClient.servers.list({ limit: 500 });
    const serverRoutes: MetadataRoute.Sitemap = res.data.map((server) => ({
      url: `${base}/servers/${server.slug}`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...serverRoutes];
  } catch {
    return staticRoutes;
  }
}
