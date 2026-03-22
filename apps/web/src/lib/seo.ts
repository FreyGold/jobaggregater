import type { Metadata } from 'next';

const SITE_NAME = 'JobAgg';
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://nimble-buttercream-897ec0.netlify.app';

export function absoluteUrl(path: string) {
  if (!path) return SITE_URL;
  try {
    return new URL(path, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

export function createMetadata(input: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
}): Metadata {
  const url = absoluteUrl(input.path ?? '/');
  const ogImage = absoluteUrl(input.image ?? '/og.png');

  const title = input.title.includes(SITE_NAME) ? input.title : `${input.title} | ${SITE_NAME}`;

  return {
    title,
    description: input.description,
    metadataBase: new URL(SITE_URL),
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
