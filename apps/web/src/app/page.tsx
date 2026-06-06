import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ServerListSection } from '@/components/server-list-section';
import { HeroTagline } from '@/components/hero-tagline';

export const metadata: Metadata = {
  title: 'MineTracker — Minecraft Server List',
  description: 'Live Minecraft server tracking. Player counts, uptime, rankings, and statistics for Java and Bedrock servers.',
};

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-foreground mb-3">
          <span className="text-primary">Mine</span>Tracker
        </h1>
        <HeroTagline />
      </div>

      <Suspense fallback={<ServerListFallback />}>
        <ServerListSection />
      </Suspense>
    </div>
  );
}

function ServerListFallback() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
      ))}
    </div>
  );
}
