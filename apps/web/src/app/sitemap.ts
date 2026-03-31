import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/jobs', '/pricing', '/about'];
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === '/' || route === '/jobs' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : route === '/jobs' ? 0.9 : 0.7,
  }));
}
