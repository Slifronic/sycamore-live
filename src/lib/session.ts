import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { sql } from './db';
import { endSession, readSession, startSession } from './auth-session';
import type { Org } from './types';

// Coordinator sign-in. A session (see auth-session.ts) names the org it is
// working in and, for a Google sign-in, the account behind it. PIN sessions
// (the demo organization, and orgs set up before Google sign-in) have no account.

export const currentOrg = cache(async (): Promise<Org | null> => {
  const s = await readSession('org');
  if (!s?.org_id) return null;
  if (s.account_id) {
    // An account removed from the org loses it on the next request.
    const [m] = await sql`select 1 from org_member where org_id = ${s.org_id} and account_id = ${s.account_id}`;
    if (!m) return null;
  }
  const [org] = (await sql`select * from org where id = ${s.org_id}`) as unknown as Org[];
  return org ?? null;
});

export type Account = { id: string; email: string; name: string; role: 'owner' | 'coordinator' };

/** The Google account behind this coordinator session, with its role in the current org. Null for PIN sessions. */
export const currentAccount = cache(async (): Promise<Account | null> => {
  const s = await readSession('org');
  if (!s?.account_id || !s.org_id) return null;
  const [a] = (await sql`
    select a.id, a.email, a.name, m.role from account a
    join org_member m on m.account_id = a.id and m.org_id = ${s.org_id}
    where a.id = ${s.account_id}`) as unknown as Account[];
  return a ?? null;
});

/** Coordinator-only path for a ?next= round trip through sign-in; anything else is /org. */
export function safeOrgNext(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  return /^\/org(\/|\?|$)/.test(s) && !s.startsWith('/org/login') && !s.startsWith('/org/start') && s.length < 300 ? s : '/org';
}

/** For pages: signed out goes to sign-in, which comes back to `next` afterwards. */
export async function requireOrg(next?: string): Promise<Org> {
  const org = await currentOrg();
  if (!org) redirect(next && next !== '/org' ? `/signin?as=org&next=${encodeURIComponent(safeOrgNext(next))}` : '/signin?as=org');
  return org;
}

export async function setOrgCookie(orgId: string, accountId: string | null = null) {
  await startSession('org', { org_id: orgId, account_id: accountId });
}

export async function clearOrgCookie() {
  await endSession('org');
}
