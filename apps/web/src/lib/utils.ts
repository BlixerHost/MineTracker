import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function formatUptime(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  return `${ms}ms`;
}

export function stripMotdColors(motd: string | null): string {
  if (!motd) return '';
  return motd.replace(/§[0-9a-fklmnor]/gi, '');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
