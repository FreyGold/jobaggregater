// ─── Home Page ───────────────────────────────────────────────────

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
        {/* ─── Hero ────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          {/* Background Gradients */}
          <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
            <div className="h-[50rem] w-[50rem] rounded-full bg-primary/5 opacity-50 blur-3xl mix-blend-multiply" />
          </div>

          <Container>
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-primary/10 hover:text-primary">
                <Zap className="h-3.5 w-3.5" />
                <span>Aggregating from 30+ job boards</span>
              </div>

              <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Every job. <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  One search.
                </span>
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Stop jumping between job boards. We aggregate thousands of listings from top
                platforms so you can find the right opportunity in one place.
              </p>

              {/* Search */}
              <div className="mx-auto mt-12 max-w-2xl">
                <div className="  border bg-card p-4 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl">
                  <SearchBar size="lg" />
                </div>
              </div>

              {/* Stats */}
              <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 sm:mt-20 sm:max-w-none sm:grid-cols-3">
                {[
                  { icon: Briefcase, value: '100K+', label: 'Active Jobs' },
                  { icon: Clock, value: '24/7', label: 'Updated Daily' },
                  { icon: Shield, value: 'Verified', label: 'Quality Listings' },
                ].map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center   bg-primary/5 p-6 shadow-sm ring-1 ring-inset ring-primary/10 transition-all hover:bg-primary/10 hover:ring-primary/20"
                  >
                    <Icon className="mx-auto h-6 w-6 text-primary" />
                    <div className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                      {value}
                    </div>
                    <div className="mt-2 text-sm font-medium text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ─── Features ────────────────────────────────────── */}
        <section className="border-t border-border bg-muted/30 py-24 sm:py-32">
          <Container>
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-primary bg-primary/10 mb-4">
                  Features
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Why JobAgg?
                </h2>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  A cleaner workflow for finding, filtering, and saving opportunities.
                </p>
              </div>

              <div className="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-3">
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
                    className="group relative border border-border bg-card p-10 text-center shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20"
                  >
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
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
