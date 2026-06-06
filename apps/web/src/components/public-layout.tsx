'use client';
import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';
import { useT } from '@/contexts/language-context';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <footer className="border-t border-border/50 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t.footer.tagline}</p>
        </div>
      </footer>
    </>
  );
}
