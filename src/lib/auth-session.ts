import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { sql } from './db';
import { randomToken, secureCookies, sha256 } from './auth-tokens';

// Server-side sessions for both sides of the app. The cookie holds a random
// 256-bit token; the database keeps only its SHA-256, the kind of session and
// who it belongs to. Signing out deletes the row, so a copied cookie stops
// working everywhere at once. Sessions slide: each use (at most hourly) pushes
// the expiry out again.

export type SessionKind = 'org' | 'vol';

const COOKIE: Record<SessionKind, string> = { org: 'sm_org', vol: 'sm_vol' };
const LEGACY: Record<SessionKind, string> = { org: 'oid', vol: 'vid' };
const TTL_DAYS: Record<SessionKind, number> = { org: 30, vol: 180 };

type Row = { id: string; org_id: string | null; account_id: string | null; volunteer_id: string | null; stale: boolean };

export const readSession = cache(async (kind: SessionKind): Promise<Row | null> => {
  const token = (await cookies()).get(COOKIE[kind])?.value;
  if (!token || token.length < 32 || token.length > 64) return null;
  const [row] = (await sql`
    select id, org_id, account_id, volunteer_id, last_seen_at < now() - interval '1 hour' as stale
    from auth_session
    where token_hash = ${sha256(token)} and kind = ${kind} and expires_at > now()`) as unknown as Row[];
  if (!row) return null;
  if (row.stale) {
    await sql`
      update auth_session set last_seen_at = now(), expires_at = now() + make_interval(days => ${TTL_DAYS[kind]})
      where id = ${row.id}`;
  }
  return row;
});

export async function startSession(
  kind: SessionKind,
  who: { org_id?: string; account_id?: string | null; volunteer_id?: string },
) {
  const jar = await cookies();
  // A fresh token on every sign-in; any session this browser already had for this side ends.
  const old = jar.get(COOKIE[kind])?.value;
  if (old) await sql`delete from auth_session where token_hash = ${sha256(old)}`;
  const token = randomToken();
  const ua = (await headers()).get('user-agent')?.slice(0, 200) ?? null;
  await sql`
    insert into auth_session (token_hash, kind, org_id, account_id, volunteer_id, expires_at, user_agent)
    values (${sha256(token)}, ${kind}, ${who.org_id ?? null}, ${who.account_id ?? null}, ${who.volunteer_id ?? null},
            now() + make_interval(days => ${TTL_DAYS[kind]}), ${ua})`;
  jar.set(COOKIE[kind], token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * TTL_DAYS[kind],
  });
  jar.delete(LEGACY[kind]);
}

export async function endSession(kind: SessionKind) {
  const jar = await cookies();
  const token = jar.get(COOKIE[kind])?.value;
  if (token) await sql`delete from auth_session where token_hash = ${sha256(token)}`;
  jar.delete(COOKIE[kind]);
  jar.delete(LEGACY[kind]);
}

/** Ends every other session for a volunteer: after a verified sign-in, or account changes. */
export async function endOtherVolunteerSessions(volunteerId: string) {
  const token = (await cookies()).get(COOKIE.vol)?.value;
  await sql`delete from auth_session where volunteer_id = ${volunteerId} and token_hash <> ${token ? sha256(token) : ''}`;
}

/** Switches the current coordinator session to another org the same account belongs to. */
export async function switchSessionOrg(sessionId: string, orgId: string) {
  await sql`update auth_session set org_id = ${orgId} where id = ${sessionId}`;
}

// Expired rows are swept opportunistically by sign-ins; no cron needed.
export async function sweepExpired() {
  await sql`delete from auth_session where expires_at < now() - interval '1 day'`;
  await sql`delete from auth_pending where expires_at < now()`;
  await sql`delete from email_code where expires_at < now() - interval '1 day'`;
  await sql`delete from rate_limit where window_start < now() - interval '1 day'`;
}
