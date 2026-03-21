import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import { createMetadata } from '@/lib/seo';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  ...createMetadata({
    title: 'JobAgg — Aggregated Job Listings',
    description:
      'Find your next opportunity from multiple job boards in one place. Browse thousands of jobs aggregated from top platforms.',
    path: '/',
  }),
  applicationName: 'JobAgg',
  category: 'jobs',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico' }],
  },
  other: {
    keywords:
      'job listings, jobs, job search, find jobs, find a job, remote jobs, software jobs, tech jobs, internships, contract jobs',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <QueryProvider>{children}</QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
