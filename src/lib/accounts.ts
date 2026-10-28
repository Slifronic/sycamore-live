import 'server-only';
import { cookies } from 'next/headers';
import { sql } from './db';
import { randomToken, secureCookies, sha256, sixDigits, safeEqual } from './auth-tokens';
import { endOtherVolunteerSessions, readSession, startSession, sweepExpired } from './auth-session';
import { setVolunteerCookie } from './vol-session';
import { sendEmail } from './mailer';
import { limit, limitByIp } from './rate-limit';
import type { GoogleIdentity } from './google';

// Who someone is once Google (or an emailed code) has vouched for an email,
// and where they go next. Used by the Google callback and the email-code routes.

export class AuthError extends Error {}

// ---------- pending sign-ups (a Google sign-in that still needs a step) ----------

const PENDING_COOKIE = 'sm_pending';

export type Pending = { kind: 'org' | 'vol'; email: string; name: string; google_sub: string; next: string | null };

async function savePending(p: Pending) {
  const token = randomToken();
  await sql`
    insert into auth_pending (token_hash, kind, email, name, google_sub, next, expires_at)
    values (${sha256(token)}, ${p.kind}, ${p.email}, ${p.name}, ${p.google_sub}, ${p.next}, now() + interval '30 minutes')`;
  (await cookies()).set(PENDING_COOKIE, token, { httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/', maxAge: 1800 });
}

export async function readPending(kind: 'org' | 'vol'): Promise<Pending | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  const [p] = (await sql`
    select kind, email, name, google_sub, next from auth_pending
    where token_hash = ${sha256(token)} and kind = ${kind} and expires_at > now()`) as unknown as Pending[];
  return p ?? null;
}

export async function clearPending() {
  const jar = await cookies();
  const token = jar.get(PENDING_COOKIE)?.value;
  if (token) await sql`delete from auth_pending where token_hash = ${sha256(token)}`;
  jar.delete(PENDING_COOKIE);
}

// ---------- volunteers ----------

/**
 * Google vouched for this person. An existing volunteer (same Google id, or the
 * same email) signs in and gets the Google id linked; anyone else continues to
 * /join with their name and email filled in, to add a birth date and consent.
 */
export async function volunteerFromGoogle(g: GoogleIdentity, next: string): Promise<string> {
  const [v] = (await sql`
    select id, google_sub, email_verified_at from volunteer
    where google_sub = ${g.sub} or email = ${g.email}
    order by (google_sub = ${g.sub}) desc nulls last limit 1`) as unknown as { id: string; google_sub: string | null; email_verified_at: Date | null }[];
  if (v) {
    if (v.google_sub && v.google_sub !== g.sub) throw new AuthError('That email is linked to a different Google account.');
    await sql`
      update volunteer set google_sub = ${g.sub}, email_verified_at = coalesce(email_verified_at, now()) where id = ${v.id}`;
    await setVolunteerCookie(v.id);
    // The first proof of owning this email ends any session someone else made with it.
    if (!v.email_verified_at) await endOtherVolunteerSessions(v.id);
    return next;
  }
  await savePending({ kind: 'vol', email: g.email, name: g.name, google_sub: g.sub, next });
  return `/join?google=1&next=${encodeURIComponent(next)}`;
}

// ---------- coordinators ----------

type AccountRow = { id: string; google_sub: string | null };

/** Finds or makes the account for a Google identity and accepts any invites for its email. */
async function upsertAccount(g: GoogleIdentity): Promise<string> {
  const [a] = (await sql`
    select id, google_sub from account where google_sub = ${g.sub} or email = ${g.email}
    order by (google_sub = ${g.sub}) desc nulls last limit 1`) as unknown as AccountRow[];
  let id: string;
  if (a) {
    if (a.google_sub && a.google_sub !== g.sub) throw new AuthError('That email is linked to a different Google account.');
    await sql`update account set google_sub = ${g.sub}, email = ${g.email}, last_sign_in_at = now() where id = ${a.id}`;
    id = a.id;
  } else {
    const [n] = (await sql`
      insert into account (email, name, google_sub, last_sign_in_at) values (${g.email}, ${g.name}, ${g.sub}, now())
      returning id`) as unknown as { id: string }[];
    id = n!.id;
  }
  await sql`
    insert into org_member (org_id, account_id, role)
    select org_id, ${id}, 'coordinator' from org_invite where email = ${g.email} and accepted_at is null
    on conflict do nothing`;
  await sql`update org_invite set accepted_at = now() where email = ${g.email} and accepted_at is null`;
  return id;
}

/** The orgs an account can open, most recently joined first. */
export async function accountOrgs(accountId: string) {
  return (await sql`
    select o.id, o.name, m.role from org_member m join org o on o.id = m.org_id
    where m.account_id = ${accountId} order by m.created_at desc`) as unknown as { id: string; name: string; role: 'owner' | 'coordinator' }[];
}

/** Google sign-in on the coordinator side. No org yet goes to setup with the account remembered. */
export async function coordinatorFromGoogle(g: GoogleIdentity, next: string): Promise<string> {
  const accountId = await upsertAccount(g);
  const orgs = await accountOrgs(accountId);
  if (!orgs.length) {
    await savePending({ kind: 'org', email: g.email, name: g.name, google_sub: g.sub, next });
    return '/org/start?google=1';
  }
  await startSession('org', { org_id: orgs[0]!.id, account_id: accountId });
  await sweepExpired();
  return next;
}

/**
 * "Link Google" from a PIN session: the Google account joins the org it is
 * signed in to, as owner if the org has none yet, and the session moves to it.
 */
export async function linkGoogleToOrg(g: GoogleIdentity): Promise<string> {
  const s = await readSession('org');
  if (!s?.org_id) throw new AuthError('Sign in to your organization first, then link Google.');
  const accountId = await upsertAccount(g);
  const [{ owners }] = (await sql`select count(*)::int as owners from org_member where org_id = ${s.org_id} and role = 'owner'`) as unknown as { owners: number }[];
  await sql`
    insert into org_member (org_id, account_id, role) values (${s.org_id}, ${accountId}, ${owners ? 'coordinator' : 'owner'})
    on conflict do nothing`;
  await startSession('org', { org_id: s.org_id, account_id: accountId });
  return '/org/settings?linked=1';
}

// ---------- emailed codes (volunteers without Google) ----------

const CODE_TTL_MIN = 10;

/** Sends a 6-digit code to an email that already has a volunteer account. Silent for unknown emails. */
export async function sendVolunteerCode(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) throw new AuthError('That email doesn’t look right.');
  await limitByIp('email-code', 10, 3600);
  await limit(`email-code:to:${email}`, 4, 900);
  const [v] = await sql`select id from volunteer where email = ${email}`;
  // Same answer either way, so the form can't be used to test who has an account.
  if (!v) return;
  const code = sixDigits();
  await sql`update email_code set used_at = now() where email = ${email} and used_at is null`;
  await sql`
    insert into email_code (email, code_hash, expires_at)
    values (${email}, ${sha256(`${email}:${code}`)}, now() + make_interval(mins => ${CODE_TTL_MIN}))`;
  await sendEmail({
    to: email,
    subject: `${code} is your SycaMore sign-in code`,
    text: `Your SycaMore sign-in code is ${code}.\n\nIt works for ${CODE_TTL_MIN} minutes. If you didn’t ask for it, ignore this email: nobody can sign in without the code.`,
  });
}

/** Checks a code and signs the volunteer in. Five wrong tries burn the code. */
export async function verifyVolunteerCode(rawEmail: string, rawCode: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.replace(/\D/g, '');
  await limitByIp('email-verify', 30, 3600);
  const [c] = (await sql`
    select id, code_hash, attempts from email_code
    where email = ${email} and used_at is null and expires_at > now()
    order by created_at desc limit 1`) as unknown as { id: string; code_hash: string; attempts: number }[];
  if (!c || c.attempts >= 5) throw new AuthError('That code expired. Send a new one.');
  if (code.length !== 6 || !safeEqual(sha256(`${email}:${code}`), c.code_hash)) {
    await sql`update email_code set attempts = attempts + 1 where id = ${c.id}`;
    throw new AuthError(c.attempts >= 4 ? 'Too many wrong codes. Send a new one.' : 'That code isn’t right. Check the email and try again.');
  }
  await sql`update email_code set used_at = now() where id = ${c.id}`;
  const [v] = (await sql`
    update volunteer set email_verified_at = coalesce(email_verified_at, now()) where email = ${email}
    returning id, (email_verified_at = now()) as first`) as unknown as { id: string; first: boolean }[];
  if (!v) throw new AuthError('That code expired. Send a new one.');
  await setVolunteerCookie(v.id);
  if (v.first) await endOtherVolunteerSessions(v.id);
}
