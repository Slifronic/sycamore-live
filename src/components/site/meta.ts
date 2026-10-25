import type { Metadata } from 'next';

// Title, description and Open Graph for a public page. Setting `openGraph` on a
// page replaces the inherited one, image included, so the shared card from
// app/opengraph-image.tsx is named here explicitly.
export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'SycaMore Live: volunteer hours recorded as the event happens, verified by the organization.',
};

export function pageMeta(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · SycaMore Live`, description, url: path, type: 'website', siteName: 'SycaMore Live', locale: 'en_US', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: `${title} · SycaMore Live`, description, images: [OG_IMAGE] },
  };
}

/** A description that fits a search snippet: at most 155 characters, cut at a word. */
export function clip(text: string, max = 155): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:.\s]+$/, '')}…`;
}
