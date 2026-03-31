// ─── Search Bar ──────────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, Loader2, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  size?: 'default' | 'lg';
}

export function SearchBar({
  placeholder = 'Search job titles, companies, or keywords...',
  defaultValue = '',
  size = 'default',
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const debouncedQuery = useDebounce(query, 400);
  const router = useRouter();
  const isFirstRender = useRef(true);

  // Sync with prop when it changes (e.g. URL navigation)
  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const trimmed = debouncedQuery.trim();
    if (trimmed) {
      router.push(`/jobs?keyword=${encodeURIComponent(trimmed)}`);
    } else if (defaultValue) {
      // Only navigate to /jobs if we had a previous query (clearing the search)
      router.push('/jobs');
    }
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLarge = size === 'lg';
  const isSearching = query !== debouncedQuery && query.trim().length > 0;

  return (
    <div className="flex w-full">
      <div className="relative flex-1">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground ${
            isLarge ? 'h-5 w-5' : 'h-4 w-4'
          }`}
        />
        <Input
          type="text"
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`pl-12 pr-10 ${
            isLarge ? 'h-14 text-base rounded-xl' : 'h-11 rounded-lg'
          }`}
        />
        {/* Right side: loading spinner or clear button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : query.length > 0 ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setQuery('')}
              className="h-6 w-6 rounded-full"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
