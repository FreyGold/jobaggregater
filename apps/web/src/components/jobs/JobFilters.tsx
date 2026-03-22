// ─── Job Filters Sidebar ─────────────────────────────────────────

'use client';

import { useState, useEffect, useId, useMemo } from 'react';
import type { JobFilters } from '@jobagg/shared';
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '@jobagg/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api';

type SourceItem = { key: string; name: string };

interface JobFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
}

export function JobFiltersSidebar({ filters, onFiltersChange }: JobFiltersProps) {
  const keywordId = useId();
  const locationId = useId();

  const [keyword, setKeyword] = useState(filters.keyword ?? '');
  const [location, setLocation] = useState(filters.location ?? '');

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceAnimating, setSourceAnimating] = useState(false);

  useEffect(() => {
    if (!sourceAnimating) return;
    const t = window.setTimeout(() => setSourceAnimating(false), 220);
    return () => window.clearTimeout(t);
  }, [sourceAnimating]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setSourcesLoading(true);
        const res = await apiClient.get<SourceItem[]>('/api/sources');
        if (!mounted) return;
        setSources(res.data ?? []);
      } catch {
        // Silently ignore; filter remains usable via URL/manual querystring.
      } finally {
        if (mounted) setSourcesLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sync local state with filters prop when it changes (e.g. via URL navigation/back)
  useEffect(() => {
    setKeyword(filters.keyword ?? '');
    setLocation(filters.location ?? '');
  }, [filters.keyword, filters.location]);

  const sourcesSorted = useMemo(() => {
    return [...sources]
      .filter((s) => !['remotive', 'indeed', 'tanqeeb', 'bayt', 'gulftalent'].includes(s.key))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sources]);

  function updateFilter(patch: Partial<JobFilters>) {
    onFiltersChange({ ...filters, ...patch, page: 1 }); // reset page on filter change
  }

  function handleSearch() {
    updateFilter({ keyword, location });
  }

  function clearAll() {
    setKeyword('');
    setLocation('');
    onFiltersChange({ page: 1, limit: 20 });
  }

  const activeCount = [
    filters.keyword,
    filters.location,
    (filters as any).arabOnly,
    filters.employmentType,
    filters.experienceLevel,
    filters.isRemote,
    filters.source,
  ].filter(Boolean).length;

  return (
    <aside className="space-y-4  border border-border bg-card p-5 shadow-sm shadow-black/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="flex h-auto items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Keyword */}
      <div className="space-y-1.5">
        <label htmlFor={keywordId} className="text-xs font-medium text-muted-foreground">
          Keyword
        </label>
        <div className="flex gap-1.5">
          <input
            id={keywordId}
            placeholder="React, Python..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSearch}
            aria-label="Search with current filters"
            title="Search"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label htmlFor={locationId} className="text-xs font-medium text-muted-foreground">
          Location
        </label>
        <input
          id={locationId}
          placeholder="City, state, or country"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Remote toggle */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Remote</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'All', value: undefined },
            { label: 'Remote', value: true },
            { label: 'On-site', value: false },
          ].map((opt) => (
            <Badge
              key={String(opt.value)}
              variant={filters.isRemote === opt.value ? 'default' : 'outline'}
              className="cursor-pointer text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => updateFilter({ isRemote: opt.value })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateFilter({ isRemote: opt.value });
                }
              }}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Region toggle */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Region</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'All', value: undefined as boolean | undefined },
            { label: 'Arab jobs only', value: true as boolean | undefined },
          ].map((opt) => (
            <Badge
              key={String(opt.value)}
              variant={(filters as any).arabOnly === opt.value ? 'default' : 'outline'}
              className="cursor-pointer text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => updateFilter({ arabOnly: opt.value } as any)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateFilter({ arabOnly: opt.value } as any);
                }
              }}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Employment Type */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Employment Type</span>
        <div className="flex flex-wrap gap-1.5">
          {EMPLOYMENT_TYPES.map((type) => (
            <Badge
              key={type}
              variant={filters.employmentType === type ? 'default' : 'outline'}
              className="cursor-pointer capitalize text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() =>
                updateFilter({
                  employmentType: filters.employmentType === type ? undefined : type,
                })
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateFilter({
                    employmentType: filters.employmentType === type ? undefined : type,
                  });
                }
              }}
            >
              {type.replace('-', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Experience Level</span>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE_LEVELS.map((level) => (
            <Badge
              key={level}
              variant={filters.experienceLevel === level ? 'default' : 'outline'}
              className="cursor-pointer capitalize text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() =>
                updateFilter({
                  experienceLevel: filters.experienceLevel === level ? undefined : level,
                })
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateFilter({
                    experienceLevel: filters.experienceLevel === level ? undefined : level,
                  });
                }
              }}
            >
              {level}
            </Badge>
          ))}
        </div>
      </div>

      {/* Source (Accordion) */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => {
            setSourceAnimating(true);
            setSourceOpen((v) => !v);
          }}
          aria-expanded={sourceOpen}
        >
          <span className="text-xs font-medium text-muted-foreground">Source</span>
          <ChevronDown
            className={
              'h-4 w-4 text-muted-foreground transition-transform ' +
              (sourceOpen ? 'rotate-180' : '')
            }
          />
        </button>

        <div
          className={
            'pt-1 transition-[max-height,opacity] duration-200 ease-out ' +
            (sourceOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0')
          }
          style={{ overflow: 'visible' }}
        >
          <div
            className={
              'flex flex-wrap gap-1.5 ' +
              (!sourceOpen && !sourceAnimating ? 'pointer-events-none' : 'pointer-events-auto')
            }
          >
            <button
              type="button"
              className={
                'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
                (filters.source
                  ? 'border-border bg-transparent text-foreground hover:bg-muted'
                  : 'border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90')
              }
              onClick={() => updateFilter({ source: undefined })}
            >
              All
            </button>

            {sourcesLoading && <span className="text-xs text-muted-foreground">Loading…</span>}

            {!sourcesLoading &&
              sourcesSorted.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
                    (filters.source === s.name
                      ? 'border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-border bg-transparent text-foreground hover:bg-muted')
                  }
                  onClick={() =>
                    updateFilter({ source: filters.source === s.name ? undefined : s.name })
                  }
                  title={s.name}
                >
                  {s.name}
                </button>
              ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
