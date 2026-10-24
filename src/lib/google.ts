import 'server-only';

// "Sign in with Google" for walk-ins. The browser gets an ID token from Google
// Identity Services; the server checks it with Google before trusting the
// email in it. Only the public client ID is needed (no client secret), so the
// button simply doesn't show when NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set.

export function googleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

export type GoogleIdentity = { sub: string; email: string; name: string };

export class GoogleError extends Error {}

const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  const clientId = googleClientId();
  if (!clientId) throw new GoogleError('Google sign-in isn’t set up for this app. Use your email instead.');
  if (!JWT.test(credential)) throw new GoogleError('That Google sign-in didn’t come through. Try again, or use your email.');

  // Google's tokeninfo endpoint checks the signature; we check who it was for.
  const res = await fetch('https://oauth2.googleapis.com/tokeninfo', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: credential }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res?.ok) throw new GoogleError('Google couldn’t confirm that sign-in. Try again, or use your email.');
  const t = (await res.json()) as Record<string, string | undefined>;

  if (t.aud !== clientId) throw new GoogleError('That Google sign-in was meant for a different app.');
  if (!t.iss || !ISSUERS.includes(t.iss)) throw new GoogleError('That sign-in didn’t come from Google.');
  if (!t.exp || Number(t.exp) * 1000 < Date.now()) throw new GoogleError('That Google sign-in expired. Tap the button again.');
  if (t.email_verified !== 'true' || !t.email || !t.sub) throw new GoogleError('Google didn’t confirm an email for that account. Use your email instead.');

  const email = t.email.toLowerCase();
  return { sub: t.sub, email, name: (t.name || t.given_name || email.split('@')[0]!).trim() };
}
