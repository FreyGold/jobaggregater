'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { JobCard } from '@/components/jobs/JobCard';
import type { Job } from '@jobagg/shared';

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
            'Authorization': `Bearer ${token}`,
          }
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
    <main className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-200px)]">
      <h1 className="text-3xl font-bold mb-6">Saved Jobs</h1>
      
      {isLoading ? (
        <div className="flex justify-center p-8">Loading bookmarks...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center p-12 border rounded-lg bg-muted/20">
          <h3 className="text-xl font-bold mb-2">No bookmarks yet</h3>
          <p className="text-muted-foreground">Save jobs you're interested in to easily find them later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </main>
  );
}
