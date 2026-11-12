// The site's public address, with no trailing slash. One definition: four files each had their
// own fallback (localhost:3000 in three, localhost:3311 in one), so a production deployment
// with NEXT_PUBLIC_APP_URL unset quietly put localhost into share links, guardian and
// supervisor emails and the Google redirect, and nothing failed until a person clicked one.
//
// In production the variable is required; on Vercel the project's production domain is used
// when it is missing. Local development falls back to the port the README runs on.
export function appUrl(): string {
  const set = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (set) return set.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercel) return `https://${vercel}`;
    throw new Error('NEXT_PUBLIC_APP_URL is not set. Links in emails, share links and Google sign-in need it. See docs/PRODUCTION.md.');
  }
  return 'http://localhost:3311';
}
