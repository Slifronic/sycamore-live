'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Counts a page view for the team's /impact page: the route and, from a
// shared link, its ?via= tag. Nothing else is sent: no cookie is read here,
// no referrer, no screen size. Browsers that send Global Privacy Control or
// Do Not Track aren't counted at all. The ?via= part is taken off the address
// bar once it's been read, so it isn't copied on when the link is shared again.
// The last view sent: a remount (React's dev double-run, a layout swap) within
// a moment of it on the same path is the same view, not a second one.
let last = { path: '', at: 0 };

export function UsageBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl || nav.doNotTrack === '1') return;
    if (last.path === pathname && Date.now() - last.at < 2000) return;
    last = { path: pathname, at: Date.now() };
    const url = new URL(window.location.href);
    const via = url.searchParams.get('via');
    if (via) {
      url.searchParams.delete('via');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    const body = JSON.stringify({ p: pathname, ...(via ? { via } : {}) });
    try {
      if (!navigator.sendBeacon?.('/api/beacon', new Blob([body], { type: 'application/json' }))) {
        void fetch('/api/beacon', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    } catch {
      // Counting is never worth an error on the page.
    }
  }, [pathname]);
  return null;
}
