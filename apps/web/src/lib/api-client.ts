import type {
  ServerDto,
  ServerCardDto,
  PaginatedResponse,
  ServerFilters,
  StatsRange,
  SubmitServerDto,
} from '@minetracker/shared';

const API_BASE =
  typeof window !== 'undefined'
    ? '/api'  // Browser: goes through Next.js rewrite proxy
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api'; // SSR: direct

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  servers: {
    list: (filters?: ServerFilters) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.set(k, String(v));
        });
      }
      const qs = params.toString();
      return apiFetch<PaginatedResponse<ServerCardDto>>(
        `/servers${qs ? `?${qs}` : ''}`,
        { next: { revalidate: 30 } },
      );
    },

    get: (slug: string) =>
      apiFetch<ServerDto>(`/servers/${slug}`, { next: { revalidate: 60 } }),

    stats: (slug: string, range: StatsRange = '24h') =>
      apiFetch<unknown[]>(`/servers/${slug}/stats?range=${range}`),

    submit: (data: SubmitServerDto) =>
      apiFetch<{ message: string }>('/servers/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  submissions: {
    submit: (data: SubmitServerDto) =>
      apiFetch<{ message: string }>('/servers/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  admin: {
    login: (email: string, password: string) =>
      apiFetch<{ access_token: string }>('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    getStats: (token: string) =>
      apiFetch<Record<string, number>>('/admin/stats', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }),

    listSubmissions: (token: string, status?: string) =>
      apiFetch<unknown[]>(`/admin/submissions${status ? `?status=${status}` : ''}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }),

    approveSubmission: (token: string, id: string) =>
      apiFetch<unknown>(`/admin/submissions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }),

    rejectSubmission: (token: string, id: string, notes?: string) =>
      apiFetch<unknown>(`/admin/submissions/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }),

    deleteSubmission: (token: string, id: string) =>
      apiFetch<unknown>(`/admin/submissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),

    listServers: (token: string) =>
      apiFetch<unknown[]>('/admin/servers', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }),

    deleteServer: (token: string, id: string) =>
      apiFetch<unknown>(`/admin/servers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),

    recheckServer: (token: string, id: string) =>
      apiFetch<unknown>(`/admin/servers/${id}/recheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }),

    getAuditLogs: (token: string) =>
      apiFetch<unknown[]>('/admin/audit-logs', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }),
  },
};
