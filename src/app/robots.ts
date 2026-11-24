import type { MetadataRoute } from 'next';
import { appUrlOr } from '@/lib/app-url';

// Crawlers get the public site. Everything behind a sign-in, and every page
// reached through a personal link (records, transcripts, walk-in and guardian
// tokens), stays out. Those pages also send noindex, so this is the second lock.
export default function robots(): MetadataRoute.Robots {
  const base = appUrlOr('http://localhost:3311');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/org/', '/me', '/join', '/checkin', '/discover', '/signin', '/v/', '/t/', '/w/', '/c/', '/e/', '/confirm/', '/guardian/', '/cal/', '/impact'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
