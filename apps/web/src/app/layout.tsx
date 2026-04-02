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

const themeConfigScript = `(function () {
  var configRaw = localStorage.getItem('theme-config');
  if (!configRaw) return;
  var config = JSON.parse(configRaw);
  if (!config || typeof config !== 'object') return;

  var storedTheme = localStorage.getItem('theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark);
  var colors = isDark ? config.dark : config.light;
  var root = document.documentElement;

  if (colors && typeof colors === 'object') {
    Object.entries(colors).forEach(function (entry) {
      var key = entry[0];
      var value = entry[1];
      if (!value) return;
      var cssKey = key.replace(/[A-Z]/g, function (match) {
        return '-' + match.toLowerCase();
      });
      root.style.setProperty('--' + cssKey, value);
    });
  }

  if (config.radius) {
    root.style.setProperty('--radius', config.radius);
    var radiusValue = parseFloat(config.radius);
    if (!Number.isNaN(radiusValue)) {
      var unit = config.radius.replace(/[\\d.]/g, '');
      root.style.setProperty('--radius-sm', String(Math.max(0, radiusValue - 0.25)) + unit);
      root.style.setProperty('--radius-md', String(Math.max(0, radiusValue - 0.125)) + unit);
      root.style.setProperty('--radius-lg', config.radius);
      root.style.setProperty('--radius-xl', String(radiusValue + 0.25) + unit);
      root.style.setProperty('--radius-2xl', String(radiusValue + 0.5) + unit);
    }
  }

  if (config.spacing) root.style.setProperty('--spacing', config.spacing);
  if (config.letterSpacing) root.style.setProperty('--letter-spacing', config.letterSpacing);
  if (config.fontSans) root.style.setProperty('--font-sans', config.fontSans);
  if (config.fontSerif) root.style.setProperty('--font-serif', config.fontSerif);
  if (config.fontMono) root.style.setProperty('--font-mono', config.fontMono);

  if (config.shadowColor) root.style.setProperty('--shadow-color', config.shadowColor);
  if (config.shadowOpacity) root.style.setProperty('--shadow-opacity', config.shadowOpacity);
  if (config.shadowBlur) root.style.setProperty('--shadow-blur', config.shadowBlur);

  if (config.shadowColor && config.shadowOpacity && config.shadowBlur) {
    var shadowOpacity = parseFloat(config.shadowOpacity);
    if (!Number.isNaN(shadowOpacity)) {
      var shadow =
        '0 1px ' +
        config.shadowBlur +
        ' 0px color-mix(in oklch, ' +
        config.shadowColor +
        ' ' +
        shadowOpacity * 100 +
        '%, transparent)';
      root.style.setProperty('--shadow', shadow);
      root.style.setProperty('--shadow-md', shadow);
      root.style.setProperty('--shadow-lg', shadow);
    }
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <script dangerouslySetInnerHTML={{ __html: themeConfigScript }} />
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
