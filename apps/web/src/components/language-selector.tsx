'use client';

import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 ${lang === 'es' ? 'text-foreground' : 'text-muted-foreground'}`}
        onClick={() => setLang('es')}
      >
        🇪🇸 ES
      </Button>
      <span className="text-muted-foreground/40">|</span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 ${lang === 'en' ? 'text-foreground' : 'text-muted-foreground'}`}
        onClick={() => setLang('en')}
      >
        🇬🇧 EN
      </Button>
    </div>
  );
}
