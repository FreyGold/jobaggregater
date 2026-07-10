'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAlertHistory } from '@/hooks/use-alerts';
import { useSaveJob, useSavedJobs } from '@/hooks/use-jobs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Calendar as CalendarIcon, Bookmark, BookmarkCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';

export default function HistoryPage() {
  const { data: history = [], isLoading: historyLoading } = useAlertHistory();
  const { data: savedJobs = [], isLoading: savedLoading } = useSavedJobs();
  const { save, unsave } = useSaveJob();

  // States
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoading = !mounted || historyLoading || savedLoading;
  
  // Create a set of saved job IDs for fast lookup
  const savedJobIds = useMemo(() => {
    return new Set(savedJobs.map(sj => sj.id || sj.jobId)); 
  }, [savedJobs]);


  // Set initial selected date to the most recent date available in history
  useEffect(() => {
    if (history.length > 0 && !selectedDate) {
      setSelectedDate(parseISO(history[0].date));
    } else if (mounted && history.length === 0 && !selectedDate) {
      setSelectedDate(new Date());
    }
  }, [history, selectedDate, mounted]);

  // Extract all unique keywords across all dates for the filter
  const allKeywords = useMemo(() => {
    const kwSet = new Set<string>();
    history.forEach(day => {
      day.keywords.forEach(k => kwSet.add(k.keyword));
    });
    return Array.from(kwSet).sort();
  }, [history]);

  // Available dates for the calendar
  const availableDates = useMemo(() => new Set(history.map(h => h.date)), [history]);

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  // Find the history entry for the currently selected date
  const selectedDayHistory = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayData = history.find(h => h.date === dateStr);
    
    if (!dayData) return null;

    // Apply keyword filters if any are selected
    if (selectedKeywords.size > 0) {
      return {
        ...dayData,
        keywords: dayData.keywords.filter(k => selectedKeywords.has(k.keyword))
      };
    }
    
    return dayData;
  }, [history, selectedDate, selectedKeywords]);

  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !availableDates.has(dateStr);
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-muted/10">
      <Header />

      <PageShell className="max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Alert History
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A 10-day timeline of your job alerts. Select a date to view matches.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column: Calendar */}
          <div className="w-full lg:w-auto shrink-0 sticky top-24">
            <Card className="p-4 inline-block bg-background/80 backdrop-blur-md">
              <h3 className="font-semibold text-sm mb-4 px-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Select Date
              </h3>
              {isLoading ? (
                <div className="w-[280px] h-[300px] flex items-center justify-center">
                  <Skeleton className="w-[250px] h-[250px] rounded-lg" />
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  className="rounded-md border-0 pointer-events-auto"
                />
              )}
            </Card>
          </div>

          {/* Right Column: Filters and Jobs */}
          <div className="flex-1 w-full space-y-6">
            {/* Filters */}
            <Card className="p-5 bg-background/80 backdrop-blur-md border-muted">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Filter by Keyword</h3>
              {isLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              ) : allKeywords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keywords found in the last 10 days.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={selectedKeywords.size === 0 ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/90 transition-colors"
                    onClick={() => setSelectedKeywords(new Set())}
                  >
                    All Keywords
                  </Badge>
                  {allKeywords.map(kw => (
                    <Badge 
                      key={kw}
                      variant={selectedKeywords.has(kw) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/90 transition-colors"
                      onClick={() => toggleKeyword(kw)}
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Job Results */}
            {isLoading ? (
              <Card className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-20 w-full mb-2" />
                <Skeleton className="h-20 w-full" />
              </Card>
            ) : !selectedDayHistory || selectedDayHistory.keywords.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
                <p className="text-muted-foreground font-medium">No job matches found for this date and filter.</p>
              </div>
            ) : (
              <Card className="overflow-hidden border-muted/60 bg-background">
                <div className="p-5 bg-muted/20 border-b flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {format(selectedDate || new Date(), 'EEEE, MMMM do, yyyy')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Jobs matching your criteria on this day
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  {selectedDayHistory.keywords.map((kwData) => (
                    <div key={kwData.keyword} className="mb-8 last:mb-0">
                      <div className="flex items-center gap-2 mb-4 border-b pb-2">
                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                          Keyword: {kwData.keyword}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          {kwData.jobs.length} job{kwData.jobs.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        {kwData.jobs.map((job) => {
                          const isSaved = savedJobIds.has(job.id);
                          return (
                            <a 
                              key={job.id} 
                              href={job.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="group block"
                            >
                              <div className="p-4 rounded-xl border bg-card text-card-foreground transition-all hover:border-primary/40 hover:shadow-sm h-full flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                      {job.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1.5 font-medium line-clamp-1">
                                      {job.company}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (isSaved) {
                                        unsave.mutate(job.id);
                                      } else {
                                        save.mutate(job.id);
                                      }
                                    }}
                                    className="-mt-1.5 -mr-1.5 p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors z-10 shrink-0"
                                    title={isSaved ? "Unsave Job" : "Save Job"}
                                  >
                                    {isSaved ? (
                                      <BookmarkCheck className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Bookmark className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                  </button>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                  <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                    {job.location || 'Remote'}
                                  </span>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                </div>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageShell>
      <Footer />
    </main>
  );
}
