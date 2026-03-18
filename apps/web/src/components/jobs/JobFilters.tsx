// ─── Job Filters Sidebar ─────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import type { JobFilters } from '@jobagg/shared';
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '@jobagg/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface JobFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
}

export function JobFiltersSidebar({ filters, onFiltersChange }: JobFiltersProps) {
  const [keyword, setKeyword] = useState(filters.keyword ?? '');
  const [location, setLocation] = useState(filters.location ?? '');

  // Sync local state with filters prop when it changes (e.g. via URL navigation/back)
  useEffect(() => {
    setKeyword(filters.keyword ?? '');
    setLocation(filters.location ?? '');
  }, [filters.keyword, filters.location]);

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
    filters.employmentType,
    filters.experienceLevel,
    filters.isRemote,
  ].filter(Boolean).length;

  return (
    <aside className="space-y-6 rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="flex h-auto items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Keyword */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Keyword</label>
        <div className="flex gap-1.5">
          <Input
            placeholder="React, Python..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9 text-sm"
          />
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleSearch}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Location</label>
        <Input
          placeholder="City, state, or country"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="h-9 text-sm"
        />
      </div>

      {/* Remote toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Remote</label>
        <div className="flex gap-2">
          {[
            { label: 'All', value: undefined },
            { label: 'Remote', value: true },
            { label: 'On-site', value: false },
          ].map((opt) => (
            <Button
              key={String(opt.value)}
              variant={filters.isRemote === opt.value ? 'default' : 'secondary'}
              size="sm"
              onClick={() => updateFilter({ isRemote: opt.value })}
              className="h-7 rounded-full px-3 text-xs font-medium"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Employment Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Employment Type</label>
        <div className="flex flex-wrap gap-1.5">
          {EMPLOYMENT_TYPES.map((type) => (
            <Badge
              key={type}
              variant={filters.employmentType === type ? 'default' : 'outline'}
              className="cursor-pointer capitalize text-xs"
              onClick={() =>
                updateFilter({
                  employmentType: filters.employmentType === type ? undefined : type,
                })
              }
            >
              {type.replace('-', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Experience Level</label>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE_LEVELS.map((level) => (
            <Badge
              key={level}
              variant={filters.experienceLevel === level ? 'default' : 'outline'}
              className="cursor-pointer capitalize text-xs"
              onClick={() =>
                updateFilter({
                  experienceLevel: filters.experienceLevel === level ? undefined : level,
                })
              }
            >
              {level}
            </Badge>
          ))}
        </div>
      </div>

      {/* Apply button */}
      <Button onClick={handleSearch} className="w-full" size="sm">
        Apply Filters
      </Button>
    </aside>
  );
}
