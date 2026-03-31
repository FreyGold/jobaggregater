// ─── Debounce Hook ───────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the value that only updates
 * after `delay` ms of inactivity.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
