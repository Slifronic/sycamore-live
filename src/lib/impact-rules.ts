// Impact tracking's pure rules: which page a visit counts under, what a "via"
// tag may be, and who counts as a bot. No database and no imports beyond the
// opportunity slug rule, so the beacon route, the dashboard and `npm test`
// all read the same definitions. Plain erasable TypeScript: Node runs it.
import { isSlug } from './opportunity-rules.ts';

/** A shared-link tag: ?via=bryant, ?via=khanh-ig. Lowercase letters, digits and hyphens, at most 32. */
export function cleanVia(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) && v.length <= 32 ? v : null;
}

/** Static top-level pages, counted as they are. */
const STATIC = new Set([
  'about', 'faq', 'privacy', 'terms', 'data', 'licenses', 'pricing', 'trust', 'how-it-works', 'volunteers',
  'organizations', 'badges', 'signin', 'join', 'checkin', 'opportunities', 'our-impact',
]);
/** Pages under these keep a known second part; anything else there is an id and is counted as [id]. */
const SECTIONS: Record<string, Set<string>> = {
  me: new Set(['records', 'messages', 'transcript', 'journey', 'account', 'badges']),
  discover: new Set(['profile']),
  org: new Set(['settings', 'learn', 'messages', 'score', 'volunteers', 'events', 'badges', 'reports', 'start', 'login']),
};
/** Links that carry a token or a code: never counted by their value. */
const TOKENS: Record<string, string> = { e: '/e/[event]', c: '/c/[page]', t: '/t/[code]', v: '/v/[code]', w: '/w/[token]', confirm: '/confirm/[token]', guardian: '/guardian/[token]', cal: '/cal/[file]' };

/**
 * The route a page view is counted under. Tokens and ids never reach the
 * database: /t/K2F9QX becomes /t/[code]. Public listings keep their slug, so
 * the team can see which ones people read. Null: don't count it (the team's
 * own dashboard, API calls, redirects, anything malformed).
 */
export function countedPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 300 || !raw.startsWith('/')) return null;
  const path = raw.split(/[?#]/)[0]!;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  const [first, second] = parts as [string, string | undefined];
  if (first === 'impact' || first === 'api' || first.startsWith('_')) return null;
  if (first === 'opportunities') {
    if (second === undefined) return '/opportunities';
    if (second === 'go') return null;
    return isSlug(second) && parts.length === 2 ? `/opportunities/${second}` : null;
  }
  if (TOKENS[first]) return second === undefined ? null : TOKENS[first]!;
  const section = SECTIONS[first];
  if (section) {
    if (second === undefined) return `/${first}`;
    if (section.has(second)) return `/${first}/${second}`;
    return `/${first}/[id]`;
  }
  if (STATIC.has(first) && second === undefined) return `/${first}`;
  return null;
}

/** Crawlers, link previews and uptime checks: not people, not counted. */
export const isBot = (ua: string | null | undefined) =>
  !ua || /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|vercel|monitor|curl|wget|python|node-fetch|axios/i.test(ua);

export const APPLICATION_STATUSES = ['applied', 'accepted', 'completed', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const isApplicationStatus = (v: unknown): v is ApplicationStatus => typeof v === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(v);
export const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  accepted: 'Accepted',
  completed: 'Finished',
  withdrawn: 'Withdrew',
};

/** "Show fewer than 5" for small groups on anything shared outside the team. */
export const SMALL_GROUP = 5;

/** A count for a public page: the number when it's at least SMALL_GROUP, else null (shown as "fewer than 5"), so no one is picked out. */
export const shareSafe = (n: number): number | null => (Number.isFinite(n) && n >= SMALL_GROUP ? n : null);
