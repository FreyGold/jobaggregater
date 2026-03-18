'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { JobCard } from '@/components/jobs/JobCard';
import type { Job } from '@jobagg/shared';
import { Card } from '@/components/ui/card';

export default function BookmarksPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchBookmarks = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/jobs/saved/list', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch bookmarks');

        const json = await res.json();
        setJobs(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [isAuthenticated, token, router]);

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen">
      <Header />

      <PageShell className="max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Saved Jobs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Keep a shortlist of roles you want to revisit.
          </p>
        </header>

        {isLoading ? (
          <Card className="flex items-center justify-center p-10 text-sm text-muted-foreground">
            Loading bookmarks…
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
