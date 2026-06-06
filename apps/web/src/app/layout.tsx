import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { PublicLayout } from '@/components/public-layout';
import { LanguageProvider } from '@/contexts/language-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'MineTracker — Minecraft Server List', template: '%s | MineTracker' },
  description: 'Track Minecraft servers in real time. Player counts, uptime, history, and statistics for Java and Bedrock servers.',
  keywords: ['minecraft', 'server list', 'minecraft servers', 'server tracker'],
  openGraph: { type: 'website', locale: 'en_US', siteName: 'MineTracker' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${mono.variable} font-sans antialiased min-h-screen bg-background`}>
        <LanguageProvider>
          <PublicLayout>{children}</PublicLayout>
        </LanguageProvider>
      </body>
    </html>
  );
}
