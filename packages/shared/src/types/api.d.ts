export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface ApiResponse<T> {
    data: T;
}
export interface ApiError {
    statusCode: number;
    message: string;
    error?: string;
}
export interface ServerFilters {
    type?: 'JAVA' | 'BEDROCK';
    status?: 'ONLINE' | 'OFFLINE';
    version?: string;
    country?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: 'players_online' | 'name' | 'created_at' | 'uptime';
    order?: 'asc' | 'desc';
}
export type StatsRange = '24h' | '7d' | '30d' | 'all';
//# sourceMappingURL=api.d.ts.map