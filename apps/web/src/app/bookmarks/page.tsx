'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { JobCard } from '@/components/jobs/JobCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSavedJobs, useSaveJob } from '@/hooks/use-jobs';
import { useCurrentSubscription } from '@/hooks/use-subscription';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BookmarksPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: jobs = [], isLoading } = useSavedJobs();
  const { data: subscription } = useCurrentSubscription();
  const { unsave } = useSaveJob();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleRemove = (jobId: string) => {
    setRemovingIds((prev) => new Set([...prev, jobId]));
    
    // Wait for animation to complete before triggering mutation
    // This prevents the flash of the item reappearing during refetch
    setTimeout(() => {
      unsave.mutate(jobId, {
        onSettled: () => {
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
        },
      });
    }, 400);
  };

  if (!isAuthenticated) return null;

  const visibleJobs = jobs.filter((job) => !removingIds.has(job.id));

  return (
    <main className="min-h-screen flex flex-col justify-between">
      <Header />

      <PageShell className="max-w-4xl">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Saved Jobs
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Keep a shortlist of roles you want to revisit.
            </p>
          </div>
          {subscription && (
            <Badge variant={subscription.plan === 'FREE' ? 'secondary' : 'default'} className="gap-1 text-xs whitespace-nowrap">
              {subscription.plan !== 'FREE' && <Crown className="h-3 w-3" />}
              {subscription.plan === 'FREE' ? 'Free' : subscription.plan}
            </Badge>
          )}
        </header>

        {isLoading ? (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
              <Skeleton className="h-24 w-full  " />
              <Skeleton className="h-24 w-full  " />
              <Skeleton className="h-24 w-full  " />
            </div>
          </Card>
        ) : visibleJobs.length === 0 && removingIds.size === 0 ? (
          <Card className="p-10 text-center">
            <h2 className="text-base font-semibold text-foreground">No bookmarks yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Save jobs you're interested in to easily find them later.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, index) => {
              const isRemoving = removingIds.has(job.id);
              const hasRemovedAbove = jobs.slice(0, index).some((j) => removingIds.has(j.id));
              const animationClass = isRemoving
                ? 'animate-blur-out'
                : hasRemovedAbove && removingIds.size > 0
                  ? 'animate-slide-up'
                  : 'animate-blur-in';

              return (
                <div
                  key={job.id}
                  className={animationClass}
                >
                  <JobCard 
                    job={job} 
                    isSaved={true}
                    onUnsave={handleRemove}
                    isBookmarksPage={true}
                  />
                </div>
              );
            })}
          </div>
        )}
      </PageShell>

      <Footer />
    </main>
  );
}
