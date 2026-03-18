// ─── Jobs Browse Page (Client) ───────────────────────────────────

'use client';

import { useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { JobFilters } from '@jobagg/shared';
import { useJobs, useSaveJob, useSavedJobs } from '@/hooks/use-jobs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JobList } from '@/components/jobs/JobList';
import { JobFiltersSidebar } from '@/components/jobs/JobFilters';

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
      page: parseInt(searchParams.get('page') ?? '1', 10),
      limit: parseInt(searchParams.get('limit') ?? '20', 10),
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
    if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit && newFilters.limit !== 20) params.set('limit', String(newFilters.limit));

    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePageChange(page: number) {
    handleFiltersChange({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Header />

      <div className="w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Browse Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggregated listings from all sources. Use filters to narrow results.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters Sidebar */}
          <div className="order-1 lg:order-1">
            <JobFiltersSidebar filters={filters} onFiltersChange={handleFiltersChange} />
          </div>

          {/* Job Listings */}
          <div className="order-2 lg:order-2">
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
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div>Loading jobs...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
