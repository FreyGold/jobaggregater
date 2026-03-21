import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Browse Jobs',
  description:
    'Browse aggregated job listings from multiple sources. Filter by remote, location, experience level, and employment type.',
  path: '/jobs',
});

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
