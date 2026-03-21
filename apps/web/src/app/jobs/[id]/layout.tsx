import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return createMetadata({
    title: 'Job Details',
    description: 'View job details, compensation, and apply on the original source.',
    path: `/jobs/${id}`,
  });
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
