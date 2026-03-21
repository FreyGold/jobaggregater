// ─── Jobs Browse Page (Client) ───────────────────────────────────

'use client';

import { useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { JobFilters } from '@jobagg/shared';
import { useJobs, useSaveJob, useSavedJobs } from '@/hooks/use-jobs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { JobList } from '@/components/jobs/JobList';
import { JobFiltersSidebar } from '@/components/jobs/JobFilters';
import { Skeleton } from '@/components/ui/skeleton';

function JobsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<JobFilters>(() => {
    return {
      keyword: searchParams.get('keyword') ?? undefined,
      location: searchParams.get('location') ?? undefined,
      employmentType: (searchParams.get('employmentType') as any) ?? undefined,
      experienceLevel: (searchParams.get('experienceLevel') as any) ?? undefined,
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
      page: parseInt(searchParams.get('page') ?? '1', 10),
      limit: parseInt(searchParams.get('limit') ?? '40', 10),
    };
  }, [searchParams]);

  const { data, isLoading, isError } = useJobs(filters);
  const { data: savedJobs } = useSavedJobs();
  const { save, unsave } = useSaveJob();

  const savedJobIds = useMemo(() => {
    if (!savedJobs) return new Set<string>();
    return new Set(savedJobs.map((j) => j.id));
  }, [savedJobs]);

  function handleFiltersChange(newFilters: JobFilters) {
    const params = new URLSearchParams();
    if (newFilters.keyword) params.set('keyword', newFilters.keyword);
    if (newFilters.location) params.set('location', newFilters.location);
    if (newFilters.employmentType) params.set('employmentType', newFilters.employmentType);
    if (newFilters.experienceLevel) params.set('experienceLevel', newFilters.experienceLevel);
    if (newFilters.isRemote !== undefined) params.set('isRemote', String(newFilters.isRemote));
    if (newFilters.arabOnly !== undefined) params.set('arabOnly', String(newFilters.arabOnly));
    if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit && newFilters.limit !== 40) params.set('limit', String(newFilters.limit));

    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePageChange(page: number) {
    handleFiltersChange({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="min-h-screen">
      <Header />

      <PageShell>
        <header className="mb-6 sm:mb-8">
          <div className="mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Search across 30+ sources
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Browse Jobs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Aggregated listings from all sources. Use filters to narrow results.
          </p>
        </header>

        <section className="bg-card/40 p-0 sm:p-2">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
            {/* Filters Sidebar */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <JobFiltersSidebar filters={filters} onFiltersChange={handleFiltersChange} />
            </div>

            {/* Job Listings */}
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

      <Footer />
    </main>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-10">
          <div className="space-y-4">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-8 space-y-4">
              <Skeleton className="h-28 w-full  " />
              <Skeleton className="h-28 w-full  " />
              <Skeleton className="h-28 w-full  " />
            </div>
          </div>
        </div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}
