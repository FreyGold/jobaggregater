// ─── Job List (with pagination) ──────────────────────────────────

'use client';

import type { Job, PaginationMeta } from '@jobagg/shared';
import { JobCard } from './JobCard';
import { JobCardSkeleton } from './JobCardSkeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import Link from 'next/link';

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
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-12 text-center">
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-16 text-center">
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
      {/* Results count */}
      {meta && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {jobs.length} of {meta.total.toLocaleString()} jobs
            {meta.cappedAt && meta.total > meta.cappedAt && (
              <span className="ml-2 font-medium text-destructive">
                (Hidden: {meta.total - meta.cappedAt})
              </span>
            )}
          </p>
          
          {meta.cappedAt && meta.total > meta.cappedAt && (
            <Link 
              href="/pricing"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Subscribe for more <ChevronRight className="h-3 w-3" />
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
        <div className="flex items-center justify-center gap-4 pt-4">
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
            Page {meta.page} of {meta.totalPages}
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
        </div>
      )}
    </div>
  );
}
