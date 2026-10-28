import 'server-only';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { randomToken, safeEqual, secureCookies } from './auth-tokens';
import type { GoogleIdentity } from './google';

// "Continue with Google" for accounts: the OAuth 2.0 authorization-code flow
// with PKCE, a state value and a nonce. The browser goes to Google and back to
// /api/auth/google/callback; the server swaps the code for an ID token
// directly with Google over TLS (OpenID Connect Core 3.1.3.7 lets a client
// skip the signature check for a token it got that way), then checks the
// audience, issuer, expiry, nonce and that Google verified the email.
//
// Needs GOOGLE_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_CLIENT_ID) and
// GOOGLE_CLIENT_SECRET. Without them every Google button hides itself.

export type GoogleIntent = 'vol' | 'org' | 'link';

type Flow = { state: string; nonce: string; verifier: string; intent: GoogleIntent; next: string };

const FLOW_COOKIE = 'sm_oauth';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

const clientId = () => (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
const clientSecret = () => (process.env.GOOGLE_CLIENT_SECRET || '').trim();

export const googleOAuthReady = () => !!clientId() && !!clientSecret();

export const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3311').replace(/\/$/, '');

const redirectUri = () => `${appOrigin()}/api/auth/google/callback`;

export class OAuthError extends Error {}

/** Starts a sign-in: remembers the flow in a short-lived cookie and returns Google's consent URL. */
export async function googleAuthUrl(intent: GoogleIntent, next: string): Promise<string> {
  const flow: Flow = { state: randomToken(24), nonce: randomToken(24), verifier: randomToken(48), intent, next };
  (await cookies()).set(FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: 'lax', // Google's redirect back is a top-level GET, which Lax allows
    path: '/api/auth/google',
    maxAge: 600,
  });
  const challenge = createHash('sha256').update(flow.verifier).digest('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return url.toString();
}

/** Finishes a sign-in from Google's redirect. Returns who signed in and what they were doing. */
export async function finishGoogle(params: URLSearchParams): Promise<{ identity: GoogleIdentity; intent: GoogleIntent; next: string }> {
  const jar = await cookies();
  const raw = jar.get(FLOW_COOKIE)?.value;
  jar.delete({ name: FLOW_COOKIE, path: '/api/auth/google' });
  let flow: Flow | null = null;
  try {
    flow = raw ? (JSON.parse(raw) as Flow) : null;
  } catch {
    flow = null;
  }
  if (!flow) throw new OAuthError('That sign-in took too long or started in another browser. Try again.');
  if (params.get('error')) throw new OAuthError('Google sign-in was cancelled.');
  const state = params.get('state') ?? '';
  const code = params.get('code') ?? '';
  if (!state || !safeEqual(state, flow.state) || !code) throw new OAuthError('That sign-in link didn’t match. Try again.');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
      code_verifier: flow.verifier,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) throw new OAuthError('Google couldn’t confirm that sign-in. Try again.');
  const { id_token } = (await res.json()) as { id_token?: string };
  const parts = id_token?.split('.') ?? [];
  if (parts.length !== 3) throw new OAuthError('Google didn’t send an identity. Try again.');

  let t: Record<string, unknown>;
  try {
    t = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new OAuthError('Google sent an identity we couldn’t read. Try again.');
  }
  if (t.aud !== clientId()) throw new OAuthError('That Google sign-in was meant for a different app.');
  if (typeof t.iss !== 'string' || !ISSUERS.includes(t.iss)) throw new OAuthError('That sign-in didn’t come from Google.');
  if (typeof t.exp !== 'number' || t.exp * 1000 < Date.now()) throw new OAuthError('That Google sign-in expired. Try again.');
  if (typeof t.nonce !== 'string' || !safeEqual(t.nonce, flow.nonce)) throw new OAuthError('That sign-in didn’t match. Try again.');
  if (t.email_verified !== true || typeof t.email !== 'string' || typeof t.sub !== 'string') {
    throw new OAuthError('Google didn’t confirm an email for that account.');
  }
  const email = t.email.toLowerCase();
  const name = String(t.name || t.given_name || email.split('@')[0]).trim().slice(0, 80);
  return { identity: { sub: t.sub, email, name }, intent: flow.intent, next: flow.next };
}
