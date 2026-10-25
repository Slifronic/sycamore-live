import type { Metadata } from 'next';

// Title, description and Open Graph for a marketing page. The OG image comes
// from app/opengraph-image.tsx, which every page inherits.
export function pageMeta(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · SycaMore Live`, description, url: path, type: 'website', siteName: 'SycaMore Live', locale: 'en_US' },
    twitter: { card: 'summary_large_image', title: `${title} · SycaMore Live`, description },
  };
}
