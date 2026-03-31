// --- Home Page ---

import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { SearchBar } from '@/components/jobs/SearchBar';
import { Briefcase, Globe, Clock, TrendingUp, Shield, Zap } from 'lucide-react';

export const metadata: Metadata = {
  ...createMetadata({
    title: 'JobAgg — Job Listings & Job Search',
    description:
      'Find jobs faster with JobAgg. Search aggregated job listings from 15+ sources, filter remote and on-site roles, and save your favorites.',
    path: '/',
  }),
  other: {
    keywords:
      'job listing, job listings, jobs, job search, find job, find jobs, find a job, remote jobs, on-site jobs, internships, contract jobs, full-time jobs, part-time jobs, software engineer jobs',
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />

      <div className="flex-1">
        {/* --- Hero --- */}
        <section className="relative overflow-hidden py-32 sm:py-48 lg:py-64">
          {/* Bold background mesh gradient */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(0.92_0.05_67.14)_0%,transparent_50%)] opacity-20 dark:opacity-10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,oklch(0.32_0.02_67)_0%,transparent_50%)] opacity-15 dark:opacity-5" />
          </div>

          <Container>
            <div className="mx-auto max-w-5xl text-center">
              <div className="mb-10 inline-flex animate-fade-in items-center gap-2.5 rounded-full border border-primary/40 bg-primary/15 px-5 py-2 text-xs font-semibold text-primary shadow-lg backdrop-blur-sm transition-all hover:border-primary/60 hover:bg-primary/25">
                <Zap className="h-4 w-4" />
                <span>Aggregating from 30+ job boards</span>
              </div>

              <h1 className="text-6xl font-black tracking-tighter text-foreground sm:text-7xl lg:text-8xl">
                Every job. <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  One search.
                </span>
              </h1>
              <p className="mx-auto mt-10 max-w-2xl text-xl leading-relaxed text-muted-foreground sm:text-2xl">
                Stop jumping between job boards. We aggregate thousands of listings from top
                platforms so you can find the right opportunity in one place.
              </p>

              {/* Search - HERO MOMENT */}
              <div className="mx-auto mt-16 max-w-3xl sm:mt-20">
                <div className="group relative">
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/40 via-primary/20 to-primary/10 opacity-0 blur-2xl transition-all duration-500 group-hover:opacity-100" />
                  <div className="relative rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-2xl backdrop-blur-md transition-all hover:border-primary/50 hover:shadow-[0_20px_40px_-10px_var(--primary)]">
                    <SearchBar size="lg" />
                  </div>
                </div>
              </div>

              {/* Stats - Bold visual punch */}
              <div className="mx-auto mt-24 grid max-w-lg grid-cols-1 gap-6 sm:mt-32 sm:max-w-none sm:grid-cols-3">
                {[
                  { icon: Briefcase, value: '100K+', label: 'Active Jobs' },
                  { icon: Clock, value: '24/7', label: 'Updated Daily' },
                  { icon: Shield, value: 'Verified', label: 'Quality Listings' },
                ].map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    className="group relative rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 p-8 shadow-lg ring-1 ring-inset ring-primary/20 transition-all hover:from-primary/25 hover:to-primary/10 hover:ring-primary/40 hover:shadow-xl"
                  >
                    <Icon className="mx-auto h-10 w-10 text-primary transition-transform group-hover:scale-125" />
                    <div className="mt-6 text-4xl font-black tracking-tight text-foreground">
                      {value}
                    </div>
                    <div className="mt-3 text-sm font-bold text-muted-foreground uppercase tracking-wide">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* --- Features --- */}
        <section className="border-t border-border bg-muted/20 py-32 sm:py-48">
          <Container>
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-6">
                  Features
                </div>
                <h2 className="text-5xl font-black tracking-tight text-foreground sm:text-6xl">
                  Why JobAgg?
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  A cleaner workflow for finding, filtering, and saving opportunities.
                </p>
              </div>

              <div className="mt-20 grid grid-cols-1 gap-8 sm:mt-24 sm:grid-cols-3">
                {[
                  {
                    icon: TrendingUp,
                    title: 'Aggregated Listings',
                    desc: 'Jobs from LinkedIn, Glassdoor, and more — all in one feed.',
                  },
                  {
                    icon: Shield,
                    title: 'Save & Track',
                    desc: 'Bookmark interesting jobs and keep track of your applications.',
                  },
                  {
                    icon: Zap,
                    title: 'Smart Filters',
                    desc: 'Filter by location, remote, experience level, and more.',
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="group relative rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-muted/50 p-10 text-center shadow-md transition-all hover:border-primary/40 hover:shadow-lg hover:from-card hover:to-primary/5"
                  >
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 transition-all group-hover:from-primary/30 group-hover:to-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{title}</h3>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>
      </div>

      <Footer />
    </main>
  );
}
