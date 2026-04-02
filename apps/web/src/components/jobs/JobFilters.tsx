// ─── Job Filters Sidebar ─────────────────────────────────────────

'use client';

import { useState, useEffect, useId, useMemo, useRef, useCallback } from 'react';
import type { JobFilters } from '@jobagg/shared';
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '@jobagg/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { X, SlidersHorizontal, CalendarIcon } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

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

  const debouncedKeyword = useDebounce(keyword, 400);
  const debouncedLocation = useDebounce(location, 400);

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Date picker state
  const dateFrom = useMemo(() => (filters.dateFrom ? new Date(filters.dateFrom) : undefined), [filters.dateFrom]);
  const [dateCalendarOpen, setDateCalendarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setSourcesLoading(true);
        const res = await apiClient.get<SourceItem[]>('/api/sources');
        if (!mounted) return;
        setSources(res.data ?? []);
      } catch {
        // Silently ignore
      } finally {
        if (mounted) setSourcesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync local state with filters prop
  useEffect(() => {
    setKeyword(filters.keyword ?? '');
    setLocation(filters.location ?? '');
  }, [filters.keyword, filters.location]);

  // Auto-search on debounced keyword/location change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    updateFilter({
      keyword: debouncedKeyword || undefined,
      location: debouncedLocation || undefined,
    });
  }, [debouncedKeyword, debouncedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const sourcesSorted = useMemo(() => {
    return [...sources]
      .filter((s) => !['remotive', 'indeed', 'tanqeeb', 'bayt', 'gulftalent'].includes(s.key))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sources]);

  function updateFilter(patch: Partial<JobFilters>) {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  }

  // Memoize filter update handlers to prevent inline functions in render
  const handleRemoteFilterChange = useCallback(
    (value: boolean | undefined) => {
      updateFilter({ isRemote: value });
    },
    [filters, onFiltersChange]
  );

  const handleEmploymentTypeChange = useCallback(
    (type: string) => {
      updateFilter({
        employmentType: filters.employmentType === type ? undefined : type,
      });
    },
    [filters, onFiltersChange]
  );

  const handleExperienceChange = useCallback(
    (level: string) => {
      updateFilter({
        experienceLevel: filters.experienceLevel === level ? undefined : level,
      });
    },
    [filters, onFiltersChange]
  );

  const handleSourceChange = useCallback(
    (source: string) => {
      updateFilter({
        source: filters.source === source ? undefined : source,
      });
    },
    [filters, onFiltersChange]
  );

  function clearAll() {
    setKeyword('');
    setLocation('');
    onFiltersChange({
      page: 1,
      limit: 20,
      dateFrom: undefined,
      employmentType: undefined,
      experienceLevel: undefined,
      source: undefined,
      isRemote: undefined,
      arabOnly: undefined,
    });
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const activeCount = [
    filters.keyword,
    filters.location,
    filters.arabOnly,
    filters.employmentType,
    filters.experienceLevel,
    filters.isRemote,
    filters.source,
    filters.dateFrom,
  ].filter(Boolean).length;

  return (
    <aside className="space-y-6 rounded-2xl border border-border bg-card/50 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filters
        </h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {/* Keyword */}
        <div className="space-y-2">
          <Label
            htmlFor={keywordId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Keyword
          </Label>
          <Input
            id={keywordId}
            placeholder="React, Python..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-10 border-border bg-background/50 transition-colors focus-visible:border-primary"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label
            htmlFor={locationId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Location
          </Label>
          <Input
            id={locationId}
            placeholder="City, state, or country"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 border-border bg-background/50 transition-colors focus-visible:border-primary"
          />
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Posted After
          </Label>
          <div className="relative">
            <Popover open={dateCalendarOpen} onOpenChange={setDateCalendarOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      'h-10 w-full justify-start text-left font-normal border-border bg-background/50 transition-colors hover:bg-muted/50',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? formatDate(dateFrom) : 'Any time'}
                  </Button>
                }
              />
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => {
                    if (date) {
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);
                      updateFilter({ dateFrom: d.toISOString() });
                    } else {
                      updateFilter({ dateFrom: undefined });
                    }
                    setDateCalendarOpen(false);
                  }}
                  disabled={(d) => d > new Date() || d < new Date('2024-01-01')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dateFrom && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full transition-colors hover:bg-muted active:scale-95"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDateCalendarOpen(false);
                  updateFilter({ dateFrom: undefined });
                }}
                aria-label="Clear date filter"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* Remote toggle */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Work Mode
          </Label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All', value: undefined },
              { label: 'Remote', value: true },
              { label: 'On-site', value: false },
            ].map((opt) => (
              <Badge
                key={String(opt.value)}
                variant={filters.isRemote === opt.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none',
                  filters.isRemote === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'border-border bg-transparent hover:border-primary/30 hover:bg-muted/50 active:scale-95'
                )}
                onClick={() => handleRemoteFilterChange(opt.value)}
                role="button"
                tabIndex={0}
                aria-pressed={filters.isRemote === opt.value}
                aria-label={`Filter by ${opt.label} work mode`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRemoteFilterChange(opt.value);
                  }
                }}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Employment Type */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Employment Type
          </Label>
          <div className="flex flex-wrap gap-2">
            {EMPLOYMENT_TYPES.map((type) => (
              <Badge
                key={type}
                variant={filters.employmentType === type ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-2.5 py-1 text-xs font-medium capitalize transition-all focus-visible:outline-none',
                  filters.employmentType === type
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'border-border bg-transparent hover:border-primary/30 hover:bg-muted/50 active:scale-95'
                )}
                onClick={() => handleEmploymentTypeChange(type)}
                role="button"
                tabIndex={0}
                aria-pressed={filters.employmentType === type}
                aria-label={`Filter by ${type.replace('-', ' ')} employment type`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEmploymentTypeChange(type);
                  }
                }}
              >
                {type.replace('-', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Experience
          </Label>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <Badge
                key={level}
                variant={filters.experienceLevel === level ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-2.5 py-1 text-xs font-medium capitalize transition-all focus-visible:outline-none',
                  filters.experienceLevel === level
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'border-border bg-transparent hover:border-primary/30 hover:bg-muted/50 active:scale-95'
                )}
                onClick={() => handleExperienceChange(level)}
                role="button"
                tabIndex={0}
                aria-pressed={filters.experienceLevel === level}
                aria-label={`Filter by ${level} experience level`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleExperienceChange(level);
                  }
                }}
              >
                {level}
              </Badge>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Source
          </Label>
          <div className="flex flex-wrap gap-2">
            {sourcesLoading ? (
              <span className="text-xs text-muted-foreground animate-pulse">
                Loading sources...
              </span>
            ) : (
              sourcesSorted.map((s) => (
                <Badge
                  key={s.key}
                  variant={filters.source === s.name ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none',
                    filters.source === s.name
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'border-border bg-transparent hover:border-primary/30 hover:bg-muted/50 active:scale-95'
                  )}
                  onClick={() => handleSourceChange(s.name)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={filters.source === s.name}
                  aria-label={`Filter by ${s.name} source`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSourceChange(s.name);
                    }
                  }}
                  title={s.name}
                >
                  {s.name}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
