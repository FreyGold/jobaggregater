// ─── Job Card ────────────────────────────────────────────────────

'use client';

import Link from 'next/link';
import type { Job } from '@jobagg/shared';
import { formatSalary, formatTimeAgo } from '@jobagg/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Building2,
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Wifi,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  isSaved?: boolean;
  onSave?: (jobId: string) => void;
  onUnsave?: (jobId: string) => void;
}

export function JobCard({ job, isSaved = false, onSave, onUnsave }: JobCardProps) {
  const salaryText = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <Card className="group hover:border-primary/20 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Job Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/jobs/${job.id}`}
                className="truncate text-base font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              >
                {job.title}
              </Link>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              {job.isRemote && (
                <span className="flex items-center gap-1 text-primary">
                  <Wifi className="h-3.5 w-3.5" />
                  Remote
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeAgo(job.postedAt)}
              </span>
            </div>

            {/* Description preview */}
            {job.shortDescription && (
              <p className="mt-2.5 text-sm text-muted-foreground line-clamp-2">
                {job.shortDescription}
              </p>
            )}

            {/* Tags & salary row */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {job.employmentType.replace('-', ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs capitalize">
                {job.experienceLevel}
              </Badge>
              {salaryText !== 'Not specified' && (
                <span className="text-xs font-medium text-primary">{salaryText}</span>
              )}
              {job.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs capitalize">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 hover:bg-muted/70"
              onClick={() => (isSaved ? onUnsave?.(job.id) : onSave?.(job.id))}
              aria-label={isSaved ? 'Unsave job' : 'Save job'}
              title={isSaved ? 'Unsave job' : 'Save job'}
            >
              {isSaved ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>

            <a
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'size-9 hover:bg-muted/70',
              )}
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View original posting"
              title="View original"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
