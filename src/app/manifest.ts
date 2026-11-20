import type { MetadataRoute } from 'next';

// Lets a volunteer add SycaMore to their home screen: it opens straight to their
// hours, full screen, in the site's own colors. No service worker: check-in needs
// the network anyway, and a stale offline copy of a record would be worse than none.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SycaMore Live',
    short_name: 'SycaMore',
    description: 'Volunteer hours recorded as the event happens, verified by the organization.',
    start_url: '/me',
    scope: '/',
    display: 'standalone',
    background_color: '#eef0e6',
    theme_color: '#eef0e6',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
