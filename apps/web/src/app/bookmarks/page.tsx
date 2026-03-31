'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { JobCard } from '@/components/jobs/JobCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSavedJobs } from '@/hooks/use-jobs';
import { useCurrentSubscription } from '@/hooks/use-subscription';
import { Crown } from 'lucide-react';

export default function BookmarksPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: jobs = [], isLoading } = useSavedJobs();
  const { data: subscription } = useCurrentSubscription();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

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
        ) : jobs.length === 0 ? (
          <Card className="p-10 text-center">
            <h2 className="text-base font-semibold text-foreground">No bookmarks yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Save jobs you’re interested in to easily find them later.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </PageShell>

      <Footer />
    </main>
  );
}
