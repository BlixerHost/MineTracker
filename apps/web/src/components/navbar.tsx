'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { GlobalStats } from './global-stats';
import { LanguageSelector } from './language-selector';
import { useT } from '@/contexts/language-context';

export function Navbar() {
  const t = useT();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground hover:text-primary transition-colors">
          <span className="text-xl">⛏️</span>
          <span>MineTracker</span>
        </Link>

        <GlobalStats />

        <nav className="flex items-center gap-2">
          <LanguageSelector />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t.nav.servers}
          </Link>
          <Button asChild size="sm">
            <Link href="/submit">
              <PlusCircle className="w-4 h-4" />
              {t.nav.addServer}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
