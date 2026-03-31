import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { ConfigProvider } from '@/providers/config-provider';
import { CustomThemeProvider } from '@/providers/custom-theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import { absoluteUrl, createMetadata, getSiteUrl } from '@/lib/seo';

const geist = Geist({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  ...createMetadata({
    title: 'JobAgg — Aggregated Job Listings',
    description:
      'Find your next opportunity from multiple job boards in one place. Browse thousands of jobs aggregated from top platforms.',
    path: '/',
  }),
  applicationName: 'JobAgg',
  category: 'jobs',
  keywords: [
    'job aggregator',
    'job board aggregator',
    'job search',
    'remote jobs',
    'software engineering jobs',
    'tech jobs',
    'internships',
    'full-time jobs',
    'part-time jobs',
  ],
  authors: [{ name: 'Ahmed Tawfik' }],
  creator: 'Ahmed Tawfik',
  publisher: 'JobAgg',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico' }],
  },
  alternates: {
    canonical: absoluteUrl('/'),
  },
  other: {
    'apple-mobile-web-app-title': 'JobAgg',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'JobAgg',
  url: getSiteUrl(),
  potentialAction: {
    '@type': 'SearchAction',
    target: `${getSiteUrl()}/jobs?keyword={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConfigProvider>
            <CustomThemeProvider>
              <AuthProvider>
                <QueryProvider>{children}</QueryProvider>
              </AuthProvider>
            </CustomThemeProvider>
          </ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
