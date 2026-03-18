// ─── Search Bar ──────────────────────────────────────────────────

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

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

  // Sync with prop when it changes (e.g. URL navigation)
  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);
  const router = useRouter();

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/jobs?keyword=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/jobs');
    }
  }, [query, router]);

  const isLarge = size === 'lg';

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
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className={`rounded-r-none border-r-0 pl-12 ${
            isLarge ? 'h-14 text-base rounded-l-xl' : 'h-11 rounded-l-lg'
          }`}
        />
      </div>
      <Button
        onClick={handleSearch}
        className={`rounded-l-none ${isLarge ? 'h-14 px-8 rounded-r-xl text-base' : 'h-11 px-6 rounded-r-lg'}`}
      >
        Search
      </Button>
    </div>
  );
}
