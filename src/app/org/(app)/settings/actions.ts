'use server';

import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { currentAccount, requireOrg } from '@/lib/session';
import { limitByIp, RateLimitError } from '@/lib/rate-limit';
import { readSession } from '@/lib/auth-session';

// Account and team: coordinators are Google accounts that belong to the org.
// Only the owner adds or removes people and changes the PIN.

export type SettingsState = { error?: string; ok?: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function requireOwner() {
  const org = await requireOrg('/org/settings');
  const me = await currentAccount();
  if (me?.role !== 'owner') return { org, me: null };
  return { org, me };
}

export async function inviteCoordinator(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { org, me } = await requireOwner();
  if (!me) return { error: 'Only the organization’s owner can add coordinators.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) return { error: 'That email doesn’t look right.' };
  try {
    await limitByIp('invite', 30, 3600);
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
  // Someone who already has an account joins straight away; anyone else joins on their first Google sign-in.
  const [a] = await sql`select id from account where email = ${email}`;
  if (a) {
    await sql`insert into org_member (org_id, account_id, role) values (${org.id}, ${a.id}, 'coordinator') on conflict do nothing`;
  } else {
    await sql`
      insert into org_invite (org_id, email, invited_by) values (${org.id}, ${email}, ${me.id})
      on conflict (org_id, email) do update set accepted_at = null, created_at = now()`;
  }
  revalidatePath('/org/settings');
  return { ok: a ? `${email} can now sign in to ${org.name}.` : `Invited. ${email} joins the first time they continue with Google.` };
}

export async function removeMember(accountId: string) {
  const { org, me } = await requireOwner();
  if (!me || accountId === me.id) return;
  await sql`delete from org_member where org_id = ${org.id} and account_id = ${accountId} and role <> 'owner'`;
  // Their open sessions end on the next request (currentOrg checks membership); delete them now too.
  await sql`delete from auth_session where org_id = ${org.id} and account_id = ${accountId}`;
  revalidatePath('/org/settings');
}

export async function revokeInvite(email: string) {
  const { org, me } = await requireOwner();
  if (!me) return;
  await sql`delete from org_invite where org_id = ${org.id} and email = ${email} and accepted_at is null`;
  revalidatePath('/org/settings');
}

export async function setPinSignIn(on: boolean) {
  const { org, me } = await requireOwner();
  if (!me) return;
  await sql`update org set pin_enabled = ${on} where id = ${org.id}`;
  // Turning it off ends every session that came from the PIN.
  if (!on) await sql`delete from auth_session where org_id = ${org.id} and account_id is null`;
  revalidatePath('/org', 'layout');
}

/** Ends every coordinator session for this org except this one (lost laptop, departed volunteer). */
export async function signOutEverywhere(_: SettingsState, form: FormData): Promise<SettingsState> {
  void form;
  const { org, me } = await requireOwner();
  if (!me) return { error: 'Only the organization’s owner can do this.' };
  const current = await readSession('org');
  const [{ n }] = await sql`
    with gone as (delete from auth_session where org_id = ${org.id} and id <> ${current!.id} returning 1)
    select count(*)::int as n from gone`;
  revalidatePath('/org/settings');
  return { ok: n ? `Signed out ${n} other ${n === 1 ? 'session' : 'sessions'}.` : 'No other sessions were open.' };
}
