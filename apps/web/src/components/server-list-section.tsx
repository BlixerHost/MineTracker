import { ServerListClient } from './server-list-client';
import { apiClient } from '@/lib/api-client';

export async function ServerListSection() {
  let initialData;
  try {
    initialData = await apiClient.servers.list({ page: 1, limit: 20, sort: 'players_online', order: 'desc' });
  } catch {
    initialData = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  return <ServerListClient initialData={initialData} />;
}
