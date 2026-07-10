// ─── Job Detail Page (Client) ────────────────────────────────────

'use client';

import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sendGAEvent } from '@next/third-parties/google';
import { useJob, useSavedJobs, useSaveJob, useAtsScore } from '@/hooks/use-jobs';
import { useResumes } from '@/hooks/use-resumes';
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
  const { data: resumes = [] } = useResumes();
  const { save, unsave } = useSaveJob();
  const atsScoreMutation = useAtsScore();
  const [atsResult, setAtsResult] = useState<{ score: number; missingKeywords: string[]; analysis: string } | null>(null);

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

  const handleScore = () => {
    if (resumes.length === 0) return;
    const baseResumeId = resumes[0].id; // using first base resume
    atsScoreMutation.mutate({ jobId: id, resumeId: baseResumeId }, {
      onSuccess: (data) => {
        setAtsResult(data);
      }
    });
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
                    title={!isAuthenticated ? 'Login to save jobs' : isSaved ? 'Remove from board' : 'Track on Board'}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {isSaved ? 'Tracking' : 'Track on Board'}
                  </Button>
                </div>

                {isAuthenticated && resumes.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" /> 
                          ATS Match Scorer
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Compare your base CV against this job description.</p>
                      </div>
                      <Button onClick={handleScore} disabled={atsScoreMutation.isPending || (hasDescription === false && !job.description)} variant="secondary">
                        {atsScoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {atsScoreMutation.isPending ? 'Scoring...' : 'Score CV'}
                      </Button>
                    </div>

                    {atsResult && (
                      <div className="bg-muted/30 rounded-lg p-5 border mt-4">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`flex items-center justify-center h-16 w-16 rounded-full border-4 font-bold text-xl ${
                            atsResult.score >= 80 ? 'border-green-500 text-green-600' : 
                            atsResult.score >= 60 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'
                          }`}>
                            {atsResult.score}%
                          </div>
                          <p className="text-sm flex-1 leading-relaxed">{atsResult.analysis}</p>
                        </div>
                        {atsResult.missingKeywords.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Missing Keywords</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {atsResult.missingKeywords.map(kw => (
                                <Badge key={kw} variant="outline" className="text-red-500 bg-red-50 dark:bg-red-950/20">{kw}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
