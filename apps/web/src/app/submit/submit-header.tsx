'use client';
import { useT } from '@/contexts/language-context';

export function SubmitHeader() {
  const t = useT();
  return (
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-bold mb-2">{t.submit.title}</h1>
      <p className="text-muted-foreground text-sm">{t.submit.description}</p>
    </div>
  );
}
