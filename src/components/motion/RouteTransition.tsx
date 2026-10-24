'use client';

import { ViewTransition } from 'react';
import { usePathname } from 'next/navigation';

// Page-level route transition for the app shells, via React's <ViewTransition>
// (the browser's View Transitions API; browsers without it just swap). The old
// page fades out in 120ms while the new one rises in: nothing waits on it, and
// the sidebar outside it stays put. Same-path updates (router.refresh, search
// params, server actions) don't animate.
//
// `groups` are path prefixes whose routes share a stateful layout (Discover
// keeps its preferences in one); they share a key, so moving inside them never
// remounts that layout.
export function RouteTransition({ children, groups = [] }: { children: React.ReactNode; groups?: string[] }) {
  const path = usePathname();
  const key = groups.find((g) => path === g || path.startsWith(`${g}/`)) ?? path;
  return (
    <ViewTransition key={key} enter="route" exit="route" default="none">
      {children}
    </ViewTransition>
  );
}
