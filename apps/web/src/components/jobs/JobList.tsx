// ─── Job List (with pagination) ──────────────────────────────────

'use client';

import type { Job, PaginationMeta } from '@jobagg/shared';
import { JobCard } from './JobCard';
import { JobCardSkeleton } from './JobCardSkeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface JobListProps {
  jobs: Job[] | undefined;
  meta?: PaginationMeta;
  isLoading: boolean;
  isError: boolean;
  savedJobIds?: Set<string>;
  onSave?: (jobId: string) => void;
  onUnsave?: (jobId: string) => void;
  onPageChange?: (page: number) => void;
}

export function JobList({
  jobs,
  meta,
  isLoading,
  isError,
  savedJobIds = new Set(),
  onSave,
  onUnsave,
  onPageChange,
}: JobListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center   border border-destructive/20 bg-destructive/5 p-12 text-center shadow-sm shadow-black/5">
        <p className="text-sm font-medium text-destructive">Failed to load jobs</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  // Empty state
  if (!jobs || jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center   border border-border bg-card p-16 text-center shadow-sm shadow-black/5">
        <Inbox className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-foreground">No jobs found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results / actions */}
      {meta && (
        <div className="flex flex-col gap-2   border border-border bg-card p-4 shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            <div>
              Showing <span className="font-medium text-foreground">{jobs.length}</span> of{' '}
              <span className="font-medium text-foreground">{meta.total.toLocaleString()}</span>{' '}
              jobs
              {meta.cappedAt && meta.total > meta.cappedAt && (
                <span className="ml-2 font-medium text-destructive">
                  (Hidden: {meta.total - meta.cappedAt})
                </span>
              )}
            </div>
          </div>

          {meta.cappedAt && meta.total > meta.cappedAt && (
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              Subscribe for more <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Job cards */}
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isSaved={savedJobIds.has(job.id)}
          onSave={onSave}
          onUnsave={onUnsave}
        />
      ))}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => onPageChange?.(meta.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{meta.page}</span> of{' '}
            <span className="font-medium text-foreground">{meta.totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasMore}
            onClick={() => onPageChange?.(meta.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
