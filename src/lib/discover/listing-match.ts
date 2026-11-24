// Public listings matched to what a volunteer told Discover, in their browser.
// Pure: no database, no network. Discover's profile never leaves the page, so
// this runs client-side on listings the server sent to everyone alike.
// Plain erasable TypeScript: `npm test` runs it directly.

export type MatchableListing = { slug: string; skills: readonly string[] };
export type SkillWishes = { learn: readonly string[]; use: readonly string[]; past: readonly string[] };
export type ListingMatch<T> = { listing: T; score: number; learn: string[]; use: string[]; past: string[] };

/**
 * Listings that use a skill the volunteer wants to learn (worth 3), already
 * uses (2), or used in a past role (1), best first, at most `n`. Ties keep the
 * board's own order. Listings with nothing in common are left out, so an empty
 * result means "fall back to the everyday picks".
 */
export function matchListings<T extends MatchableListing>(listings: readonly T[], wishes: SkillWishes, n = 3): ListingMatch<T>[] {
  const learn = new Set(wishes.learn);
  const use = new Set(wishes.use);
  const past = new Set(wishes.past);
  if (!learn.size && !use.size && !past.size) return [];
  return listings
    .map((listing, i) => {
      const skills = listing.skills ?? [];
      const l = skills.filter((k) => learn.has(k));
      const u = skills.filter((k) => use.has(k) && !learn.has(k));
      const p = skills.filter((k) => past.has(k) && !learn.has(k) && !use.has(k));
      return { listing, score: l.length * 3 + u.length * 2 + p.length, learn: l, use: u, past: p, i };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, n)
    .map(({ i: _i, ...m }) => m);
}

/** "Builds market research and design, which you want to learn." */
export function matchReason(m: { learn: string[]; use: string[]; past: string[] }): string {
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  if (m.learn.length) return `Builds ${list(m.learn.slice(0, 3))}, which you want to learn.`;
  if (m.use.length) return `Uses ${list(m.use.slice(0, 3))}, which you already do.`;
  return `Uses ${list(m.past.slice(0, 3))}, from your past roles.`;
}
