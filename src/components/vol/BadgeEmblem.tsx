import type { BadgeKey } from '@/lib/badges';
import s from './badge.module.css';

// One mark per badge key, on a hex tile. Green only once an organization has
// signed it; progress and locked badges stay ink-on-stone.

const MARKS: Record<BadgeKey, React.ReactNode> = {
  team_leadership: <path d="M7 21V4m0 1h10l-2.5 3.5L17 12H7M4 21h7" />,
  event_coordination: <path d="M9 4h6v3H9zM7 5.5H5.5V20h13V5.5H17M8.5 11.5l2 2 4-4M8.5 16.5h7" />,
  urban_canopy: <path d="M12 21v-7m0 0c-4 0-6.5-2.5-6.5-6 3.5 0 6.5 2 6.5 6Zm0-3c0-4 2.5-7 6.5-7 0 4-2.5 7-6.5 7Z" />,
  resource_logistics: <path d="m4 8 8-4 8 4v8l-8 4-8-4zm0 0 8 4 8-4M12 12v8M8 6l8 4" />,
};

export function BadgeEmblem({ badge, state, size = 'md' }: { badge: BadgeKey; state: 'signed' | 'ready' | 'progress' | 'locked'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`${s.emblem} ${s[state]} ${s[size]}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {MARKS[badge]}
      </svg>
    </span>
  );
}
