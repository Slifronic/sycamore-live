// Demo mode: the seeded, made-up data. On whenever SYCAMORE_DEMO=1, and in any
// non-production run (next dev, tests). The app had no demo switch before this;
// lib/db.ts uses the same NODE_ENV check for its dev-only connection cache.
export function isDemo(): boolean {
  return process.env.SYCAMORE_DEMO === '1' || process.env.NODE_ENV !== 'production';
}
