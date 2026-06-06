'use client';
import { useT } from '@/contexts/language-context';

export function HeroTagline() {
  const t = useT();
  return (
    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
      {t.hero.tagline}
    </p>
  );
}
