import type { MetadataRoute } from 'next';
import { appUrlOr } from '@/lib/app-url';

// The public site only. Records, transcripts, event pages and listings reached
// through a shared link send noindex and are left out on purpose: a volunteer's
// record (often a minor's) should be found through the link they share, not a search.
const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/volunteers', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/organizations', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/opportunities', priority: 0.8, changeFrequency: 'daily' },
  { path: '/badges', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/trust', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/our-impact', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/data', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/licenses', priority: 0.2, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrlOr('http://localhost:3311');
  return PAGES.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority }));
}
