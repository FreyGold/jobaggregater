'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useTailoredResumes, useDeleteTailored } from '@/hooks/use-resumes';
import { Copy, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TailoredPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: tailoredList = [], isLoading } = useTailoredResumes();
  const deleteMutation = useDeleteTailored();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleDelete = (id: string) => {
    setRemovingIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      deleteMutation.mutate(id, {
        onSettled: () => {
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      });
    }, 400);
  };

  const scoreColor = (score: number) => {
    if (score < 50) return 'text-red-500 border-red-200 bg-red-50 dark:bg-red-950/20';
    if (score <= 75) return 'text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-950/20';
    return 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20';
  };

  return (
    <main className="min-h-screen flex flex-col justify-between">
      <Header />

      <PageShell className="max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Tailored CVs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            AI-tailored versions of your CV, optimized for specific job listings.
          </p>
        </header>

        {isLoading ? (
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        ) : tailoredList.length === 0 && removingIds.size === 0 ? (
          <Card className="p-10 text-center">
            <h2 className="text-base font-semibold text-foreground">No tailored CVs yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Use the JobAgg browser extension to tailor your CV for any job listing.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tailoredList.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              const isRemoving = removingIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={cn(
                    isRemoving && 'animate-blur-out',
                  )}
                >
                  <Card className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-semibold text-foreground truncate">
                            {item.jobTitle}
                          </h3>
                          <span className="text-sm text-muted-foreground">at</span>
                          <span className="text-sm font-medium text-foreground">
                            {item.companyName}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn('text-sm font-semibold px-3 py-1 shrink-0', scoreColor(item.score))}
                      >
                        {item.score}% Match
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(item.id)}
                        className="gap-1 text-xs"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Hide CV</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> Show CV</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(item.id, item.tailoredContent)}
                        className="gap-1 text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedId === item.id ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="gap-1 text-xs text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4">
                        <pre className="rounded-lg bg-muted p-4 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap">
                          {item.tailoredContent}
                        </pre>
                      </div>
                    )}
                  </Card>
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
