import type { Metadata } from 'next';

const SITE_NAME = 'JobAgg';
const DEFAULT_SITE_URL = 'https://nimble-buttercream-897ec0.netlify.app';

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl();
  if (!path) return siteUrl;
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return siteUrl;
  }
}

export function createMetadata(input: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
}): Metadata {
  const siteUrl = getSiteUrl();
  const url = absoluteUrl(input.path ?? '/');
  const ogImage = absoluteUrl(input.image ?? '/opengraph-image');

  const title = input.title.includes(SITE_NAME) ? input.title : `${input.title} | ${SITE_NAME}`;

  return {
    title,
    description: input.description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: url,
    },
    robots: input.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: 'website',
      url,
      title,
      siteName: SITE_NAME,
      description: input.description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: input.description,
      images: [ogImage],
    },
  };
}
