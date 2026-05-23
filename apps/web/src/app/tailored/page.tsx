'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Copy, Trash2, ChevronDown, ChevronUp, FileDown, Pencil, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TailoredPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: tailoredList = [], isLoading } = useTailoredResumes();
  const deleteMutation = useDeleteTailored();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const toggleExpand = (id: string, content: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const saveEdit = (id: string) => {
    setEditingId(null);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
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

  const handleDownloadPdf = (item: { jobTitle: string; companyName: string; tailoredContent: string; score: number }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${item.jobTitle} - Tailored CV</title>
        <style>
          @page { margin: 20mm 15mm; size: A4; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 210mm;
            margin: 0 auto;
            padding: 30px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 { font-size: 20pt; margin-bottom: 4px; }
          .header .subtitle { font-size: 10pt; color: #555; }
          .match-badge {
            display: inline-block;
            background: #059669;
            color: white;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 9pt;
            margin-top: 8px;
          }
          .content {
            white-space: pre-wrap;
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.6;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${item.jobTitle}</h1>
          <div class="subtitle">Tailored for ${item.companyName}</div>
          <div class="match-badge">${item.score}% Match</div>
        </div>
        <div class="content">${item.tailoredContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <script>
          window.onload = function() { window.print(); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
          <div className="space-y-4" ref={printRef}>
            {tailoredList.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              const isRemoving = removingIds.has(item.id);
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className={cn(isRemoving && 'animate-blur-out')}
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
                            year: 'numeric', month: 'short', day: 'numeric',
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

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => toggleExpand(item.id, item.tailoredContent)}
                        className="gap-1 text-xs"
                      >
                        {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Hide CV</> : <><ChevronDown className="h-3.5 w-3.5" /> Show CV</>}
                      </Button>
                      {isExpanded && !isEditing && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => startEdit(item.id, item.tailoredContent)}
                          className="gap-1 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                      {isExpanded && isEditing && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => saveEdit(item.id)}
                          className="gap-1 text-xs text-green-500"
                        >
                          <Save className="h-3.5 w-3.5" /> Save
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleCopy(item.id, isEditing ? editContent : item.tailoredContent)}
                        className="gap-1 text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedId === item.id ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleDownloadPdf(item)}
                        className="gap-1 text-xs"
                      >
                        <FileDown className="h-3.5 w-3.5" /> PDF
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="gap-1 text-xs text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4">
                        {isEditing ? (
                          <textarea
                            className="w-full rounded-lg bg-muted p-4 text-sm leading-relaxed font-mono resize-y min-h-[200px] outline-none ring-1 ring-primary/30 focus:ring-2"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                        ) : (
                          <pre className="rounded-lg bg-muted p-4 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap">
                            {item.tailoredContent}
                          </pre>
                        )}
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
