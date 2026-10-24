'use client';

import { useRef, type ReactNode } from 'react';

// Port of spotlight.md for a group of cards. One pointer handler on the group
// writes --mx/--my onto whichever [data-spot] card is under the pointer.
// Custom properties, not React state, so nothing re-renders as the mouse moves.

export function SpotlightGroup({ children, className }: { children: ReactNode; className?: string }) {
  const last = useRef<HTMLElement | null>(null);
  return (
    <div
      className={className}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const card = (e.target as HTMLElement).closest<HTMLElement>('[data-spot]');
        if (last.current && last.current !== card) last.current.style.setProperty('--mx', '-999px');
        last.current = card;
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      onPointerLeave={() => {
        last.current?.style.setProperty('--mx', '-999px');
        last.current = null;
      }}
    >
      {children}
    </div>
  );
}
