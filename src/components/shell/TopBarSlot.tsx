'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const SLOT_ID = 'topbar-views-slot';

const noop = () => () => {};

/**
 * Put a page's own sub-view control in the coordinator top bar, replacing the
 * section's default switcher (org-nav.ts SECTION_VIEWS) while the page is
 * shown. Prefer SECTION_VIEWS for plain link tabs: it renders on the server
 * with no flash. Use this only for controls that depend on the page's data.
 *
 *   <TopBarSlot><Segmented id="range" size="sm" label="Range" items={…} /></TopBarSlot>
 */
export function TopBarSlot({ children }: { children: ReactNode }) {
  const el = useSyncExternalStore(
    noop,
    () => document.getElementById(SLOT_ID),
    () => null,
  );
  return el ? createPortal(children, el) : null;
}
