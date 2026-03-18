// ─── Home Page ───────────────────────────────────────────────────

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchBar } from '@/components/jobs/SearchBar';
import { Briefcase, Globe, Clock, TrendingUp, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col justify-between">
      <Header />

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" />
            Aggregating from 15+ job boards
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Every job. <span className="text-primary">One search.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Stop jumping between job boards. We aggregate thousands of listings from top platforms
            so you can find the right opportunity in one place.
          </p>

          {/* Search */}
          <div className="mt-10 mx-auto max-w-xl">
            <SearchBar size="lg" />
          </div>

          {/* Stats */}
          <div className="mt-16 flex justify-center gap-10 sm:gap-16">
            {[
              { icon: Briefcase, label: 'Jobs Listed', value: '10,000+' },
              { icon: Globe, label: 'Sources', value: '15+' },
              { icon: Clock, label: 'Updated', value: 'Hourly' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="mx-auto h-5 w-5 text-primary/60 mb-2" />
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────── */}
      <section className="border-t border-border bg-card/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-foreground">Why JobAgg?</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: 'Aggregated Listings',
                desc: 'Jobs from LinkedIn, Indeed, Glassdoor, and more — all in one feed.',
              },
              {
                icon: Shield,
                title: 'Save & Track',
                desc: 'Bookmark interesting jobs and keep track of your applications.',
              },
              {
                icon: Zap,
                title: 'Smart Filters',
                desc: 'Filter by salary, location, remote, experience level, and more.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 text-center">
                <Icon className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
