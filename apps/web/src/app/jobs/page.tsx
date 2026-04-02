// ─── Jobs Browse Page (Client) ───────────────────────────────────

'use client';

import { useMemo, Suspense, useCallback, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { JobFilters } from '@jobagg/shared';
import { useJobs, useSaveJob, useSavedJobs } from '@/hooks/use-jobs';
import { useCurrentSubscription } from '@/hooks/use-subscription';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { JobList } from '@/components/jobs/JobList';
import { JobFiltersSidebar } from '@/components/jobs/JobFilters';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutList, Sparkles, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabValue = 'all' | 'today';

// ─── Premium Tab Switcher ─────────────────────────────────────────
function PremiumTabSwitcher({
  value,
  onChange,
}: {
  value: TabValue;
  onChange: (v: TabValue) => void;
}) {
  const [pressedTab, setPressedTab] = useState<TabValue | null>(null);

  const tabs = [
    { id: 'all' as const, label: 'All Jobs', icon: LayoutList },
    { id: 'today' as const, label: "Today's Jobs", icon: Sparkles },
  ];

  const handlePress = (id: TabValue) => {
    setPressedTab(id);
    onChange(id);
    setTimeout(() => setPressedTab(null), 200);
  };

  return (
    <div className="relative flex w-fit items-center p-1 bg-muted/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-inner group">
      {/* Sliding Background */}
      <div 
        className={cn(
          "absolute inset-y-1 left-1 rounded-xl bg-card shadow-sm transition-all duration-300 ease-out border border-border/20",
          value === 'all' ? "w-[calc(50%-4px)] translate-x-0" : "w-[calc(50%-4px)] translate-x-full"
        )} 
      />
      
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handlePress(id)}
          className={cn(
            "relative z-10 flex min-w-[140px] items-center justify-center gap-2.5 py-2.5 px-6 text-sm font-semibold transition-all duration-150 rounded-xl",
            pressedTab === id ? "scale-95" : "scale-100",
            value === id 
              ? "text-foreground" 
              : "text-muted-foreground hover:text-foreground/80 hover:bg-white/5"
          )}
        >
          <Icon className={cn(
            "h-4 w-4 transition-transform duration-300",
            value === id ? "scale-110 text-primary" : "scale-100 opacity-60"
          )} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Content Component ───────────────────────────────────────
function JobsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: subscription } = useCurrentSubscription();

  const activeTab = (searchParams.get('tab') ?? 'all') as TabValue;

  const filters = useMemo<JobFilters>(() => {
    const base: JobFilters = {
      tab: activeTab === 'today' ? 'today' : undefined,
      keyword: searchParams.get('keyword') ?? undefined,
      location: searchParams.get('location') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      employmentType: searchParams.get('employmentType') ?? undefined,
      experienceLevel: searchParams.get('experienceLevel') ?? undefined,
      isRemote:
        searchParams.get('isRemote') === 'true'
          ? true
          : searchParams.get('isRemote') === 'false'
            ? false
            : undefined,
      arabOnly:
        searchParams.get('arabOnly') === 'true'
          ? true
          : searchParams.get('arabOnly') === 'false'
            ? false
            : undefined,
      // Don't calculate dateFrom here anymore - let the backend handle tab=today
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      page: parseInt(searchParams.get('page') ?? '1', 10),
      limit: parseInt(searchParams.get('limit') ?? '40', 10),
    };
    return base;
  }, [
    searchParams.get('keyword'),
    searchParams.get('location'),
    searchParams.get('source'),
    searchParams.get('employmentType'),
    searchParams.get('experienceLevel'),
    searchParams.get('isRemote'),
    searchParams.get('arabOnly'),
    searchParams.get('dateFrom'),
    searchParams.get('page'),
    searchParams.get('limit'),
    activeTab,
  ]);

  const { data, isLoading, isError } = useJobs(filters);
  const { data: savedJobs } = useSavedJobs();
  const { save, unsave } = useSaveJob();

  const savedJobIds = useMemo(() => {
    if (!savedJobs) return new Set<string>();
    return new Set(savedJobs.map((j) => j.id));
  }, [savedJobs]);

  const syncToUrl = useCallback((newFilters: JobFilters, tabOver?: TabValue) => {
    const params = new URLSearchParams();
    const currentTab = tabOver ?? activeTab;
    
    if (currentTab !== 'all') params.set('tab', currentTab);
    if (newFilters.keyword) params.set('keyword', newFilters.keyword);
    if (newFilters.location) params.set('location', newFilters.location);
    if (newFilters.source) params.set('source', newFilters.source);
    if (newFilters.employmentType) params.set('employmentType', newFilters.employmentType);
    if (newFilters.experienceLevel) params.set('experienceLevel', newFilters.experienceLevel);
    if (newFilters.isRemote !== undefined) params.set('isRemote', String(newFilters.isRemote));
    if (newFilters.arabOnly !== undefined) params.set('arabOnly', String(newFilters.arabOnly));
    
    // dateFrom only persists in URL if in 'all' tab (today tab forces it)
    if (currentTab === 'all' && newFilters.dateFrom) {
      params.set('dateFrom', newFilters.dateFrom);
    }
    
    if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit && newFilters.limit !== 40) params.set('limit', String(newFilters.limit));

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [pathname, activeTab, router]);

  function handleTabChange(tab: TabValue) {
    // Reset to page 1, don't manipulate dateFrom anymore - backend handles tab
    const resetFilters = { 
      ...filters, 
      page: 1,
      dateFrom: undefined,
    };
    syncToUrl(resetFilters, tab);
  }

  function handlePageChange(page: number) {
    syncToUrl({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <Header />

      <PageShell>
        <header className="mb-10 mt-4 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">
              Live Feed
            </div>
            {subscription && (
              <Badge variant={subscription.plan === 'FREE' ? 'secondary' : 'default'} className="gap-1 text-xs">
                {subscription.plan !== 'FREE' && <Crown className="h-3 w-3" />}
                {subscription.plan === 'FREE' ? 'Free' : subscription.plan}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl max-w-3xl leading-[1.1]">
            Find your next <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">career move</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground/80">
            Real-time job listings from 30+ sources, processed and filtered for you.
          </p>
          
          <div className="mt-10">
            <PremiumTabSwitcher value={activeTab} onChange={handleTabChange} />
          </div>
        </header>

        <section className="mt-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
            {/* Sidebar with sticky positioning */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
              <JobFiltersSidebar filters={filters} onFiltersChange={(f) => syncToUrl(f)} />
            </div>

            {/* Results body */}
            <section aria-label="Job results" className="min-w-0">
              <JobList
                jobs={data?.jobs}
                meta={data?.meta}
                isLoading={isLoading}
                isError={isError}
                savedJobIds={savedJobIds}
                onSave={(id) => save.mutate(id)}
                onUnsave={(id) => unsave.mutate(id)}
                onPageChange={handlePageChange}
              />
            </section>
          </div>
        </section>
      </PageShell>
      
      <div className="h-20" />
      <Footer />
    </main>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 flex flex-col items-center">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="mt-20 w-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12">
            <Skeleton className="h-[600px] w-full rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}
