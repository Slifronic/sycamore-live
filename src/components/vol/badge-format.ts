import { fmtHours } from '@/lib/hours';
import type { VolBadge } from '@/lib/vol-badges';

export const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

/** "2 / 3 events · 6 / 9 hours", from the badge's own targets in badges.ts. */
export const targetLine = (b: Pick<VolBadge, 'best'>) =>
  b.best?.targets.map((t) => `${t.unit === 'hours' ? fmtHours(Math.min(t.have, t.need)) : Math.min(t.have, t.need)} / ${t.need} ${t.unit}`).join(' · ') ?? '';
