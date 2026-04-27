// ─── Job Detail Page (Client) ────────────────────────────────────

'use client';

import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sendGAEvent } from '@next/third-parties/google';
import { useJob, useSavedJobs, useSaveJob } from '@/hooks/use-jobs';
import { useAuth } from '@/providers/auth-provider';
import { apiClient, ApiError } from '@/lib/api';
import { formatSalary, formatTimeAgo } from '@jobagg/shared';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  DollarSign,
  Wifi,
  ArrowLeft,
  Briefcase,
  BarChart3,
  Download,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/seo';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { data: job, isLoading, isError, refetch } = useJob(id);
  const { data: savedJobs = [] } = useSavedJobs();
  const { save, unsave } = useSaveJob();
  const [enrichedDescription, setEnrichedDescription] = useState<string | null>(null);
  const [isEnrichingDescription, setIsEnrichingDescription] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);

  // Check if current job is saved
  const isSaved = savedJobs.some((j) => j.id === id);

  // Preserve all search params when going back
  const backUrl = `/jobs?${searchParams.toString()}`;

  const handleToggleSave = () => {
    if (!isAuthenticated) return;
    if (isSaved) {
      unsave.mutate(id);
    } else {
      save.mutate(id);
    }
  };

  const handleFetchDescription = async () => {
    setIsEnrichingDescription(true);
    setEnrichmentError(null);
    
    try {
      const enrichedJob = await apiClient.post<{ description: string }>(`/api/jobs/${id}/enrich-description`);
      const desc = enrichedJob.data?.description;
      setEnrichedDescription(desc ?? null);
      refetch();
    } catch (error) {
      if (error instanceof ApiError) {
        setEnrichmentError(error.message);
      } else {
        setEnrichmentError(error instanceof Error ? error.message : 'Failed to fetch description');
      }
    } finally {
      setIsEnrichingDescription(false);
    }
  };

  const descriptionToShow = enrichedDescription || job?.description;
  const hasDescription = !!descriptionToShow && descriptionToShow.trim().length > 0;

  return (
    <main className="min-h-screen justify-between flex flex-col">
      <Header />

      <PageShell className="max-w-3xl">
        {/* Back link */}
        <Link
          href={backUrl}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        )}

        {isError && (
          <div className="  border border-destructive/20 bg-destructive/5 p-12 text-center">
            <p className="text-sm font-medium text-destructive">Failed to load job</p>
          </div>
        )}

        {job && (
          <>
            {/* JSON-LD */}
            <script
              type="application/ld+json"
              // Keep it as minimal, valid JobPosting schema; omit unknowns.
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'JobPosting',
                  title: job.title,
                  description: job.description,
                  hiringOrganization: {
                    '@type': 'Organization',
                    name: job.company,
                  },
                  jobLocationType: job.isRemote ? 'TELECOMMUTE' : undefined,
                  applicantLocationRequirements: job.isRemote
                    ? { '@type': 'Country', name: 'Worldwide' }
                    : undefined,
                  jobLocation: job.isRemote
                    ? undefined
                    : {
                        '@type': 'Place',
                        address: {
                          '@type': 'PostalAddress',
                          addressLocality: job.location,
                        },
                      },
                  employmentType: job.employmentType,
                  datePosted: job.postedAt,
                  validThrough: undefined,
                  identifier: {
                    '@type': 'PropertyValue',
                    name: job.sourceName,
                    value: job.id,
                  },
                  directApply: false,
                  url: absoluteUrl(`/jobs/${job.id}`),
                }),
              }}
            />

            <article className="space-y-6">
              {/* Header */}
              <header className="rounded-xl border border-border bg-card p-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {job.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {job.company}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </span>
                  {job.isRemote && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <Wifi className="h-4 w-4" />
                      Remote
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatTimeAgo(job.postedAt)}
                  </span>
                </div>

                {/* Badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    <Briefcase className="mr-1 h-3 w-3" />
                    {job.employmentType.replace('-', ' ')}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    <BarChart3 className="mr-1 h-3 w-3" />
                    {job.experienceLevel}
                  </Badge>
                  {job.salaryMin && (
                    <Badge variant="default">
                      <DollarSign className="mr-0.5 h-3 w-3" />
                      {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                {job.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: 'lg', className: 'flex items-center gap-2' })}
                    onClick={() => sendGAEvent({ event: 'apply_click', value: job.id, company: job.company, title: job.title })}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Apply on Source</span>
                  </a>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={handleToggleSave}
                    disabled={!isAuthenticated}
                    title={!isAuthenticated ? 'Login to save jobs' : isSaved ? 'Remove from saved' : 'Save job'}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {isSaved ? 'Saved' : 'Save Job'}
                  </Button>
                </div>
              </header>

              {/* Description */}
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Job Description</h2>
                  
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleFetchDescription}
                      disabled={isEnrichingDescription}
                      title="Fetch full job description from source"
                    >
                      {isEnrichingDescription ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Fetch Description
                        </>
                      )}
                    </Button>
                 
                </div>
                
                {enrichmentError && (
                  <div className="mb-4 rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    {enrichmentError}
                  </div>
                )}

                {hasDescription ? (
                  <div
                    className="mt-4 prose prose-sm prose-zinc max-w-none text-muted-foreground [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: descriptionToShow }}
                  />
                ) : (
                  <div className="rounded border border-border bg-muted/30 p-8 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Job description is not available. Click the button above to fetch it from the source.
                    </p>
                  </div>
                )}
              </section>

              {/* Source info */}
              {((job as any).sourceName || (job as any).sourceId || (job as any).source) && (
                <footer className="pt-1 text-center text-xs text-muted-foreground">
                  Source: {(job as any).sourceName ?? (job as any).source ?? (job as any).sourceId}
                </footer>
              )}
            </article>
          </>
        )}
      </PageShell>

      <Footer />
    </main>
  );
}
