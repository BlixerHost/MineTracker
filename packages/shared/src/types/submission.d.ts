import type { ServerType, SubmissionStatus } from './server';
export interface SubmitServerDto {
    name: string;
    host: string;
    port: number;
    type: ServerType;
    websiteUrl?: string;
    discordUrl?: string;
    contactEmail?: string;
}
export interface ServerSubmissionDto {
    id: number;
    name: string;
    host: string;
    port: number;
    type: ServerType;
    websiteUrl: string | null;
    discordUrl: string | null;
    contactEmail: string | null;
    status: SubmissionStatus;
    lastPingError: string | null;
    notes: string | null;
    createdAt: string;
    reviewedAt: string | null;
}
//# sourceMappingURL=submission.d.ts.map