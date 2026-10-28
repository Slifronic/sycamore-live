'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { pin } from '@/lib/codes';
import { clearOrgCookie, requireOrg, safeOrgNext, setOrgCookie } from '@/lib/session';
import { clearPending, readPending } from '@/lib/accounts';
import { googleOAuthReady } from '@/lib/google-oauth';
import { limit, limitByIp, RateLimitError } from '@/lib/rate-limit';
import { addManual, attestEvent, checkOutAll, checkOutAttendance, createEvent, getEvent, markLesson, RuleError, type AttestRow } from '@/lib/org-data';
import { loadOrgInsights } from '@/lib/insights';
import { badgeByKey, type BadgeKey } from '@/lib/badges';
import type { Activity } from '@/lib/types';
import type { LessonKey } from '@/lib/course';

export type FormState = { error?: string; ok?: string } | null;

const PRACTICE_NAMES = ['Ana Practice', 'Ben Practice', 'Cleo Practice', 'Dev Practice', 'Eli Practice', 'Fay Practice'];


export async function startOrg(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get('name') ?? '').trim().slice(0, 120);
  const kind = form.get('kind') === 'school' ? 'school' : 'nonprofit';
  const phone = String(form.get('phone') ?? '').trim().slice(0, 40);
  // With Google on, setup needs the Google sign-in it came from: the account
  // becomes the org's owner and the PIN stays off. Without Google (local
  // development), the four boxes and a PIN work as before.
  const pending = await readPending('org');
  if (googleOAuthReady() && !pending) return { error: 'Continue with Google first, so your organization has an owner who can sign in.' };
  const coordinator = (pending?.name ?? String(form.get('coordinator') ?? '')).trim().slice(0, 80);
  const email = (pending?.email ?? String(form.get('email') ?? '')).trim().slice(0, 200);
  if (!name || !coordinator || !email || !phone) return { error: 'Fill in every box. They print on every record you issue.' };
  if (pending) {
    const [a] = await sql`select 1 from account where google_sub = ${pending.google_sub}`;
    if (!a) return { error: 'That Google sign-in expired. Continue with Google again.' };
  }
  try {
    await limitByIp('org-start', 5, 3600);
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }

  let orgId: string | null = null;
  for (let i = 0; i < 5 && !orgId; i++) {
    try {
      const [org] = await sql`
        insert into org (name, contact_phone, contact_email, coordinator_name, coordinator_pin, kind, pin_enabled)
        values (${name}, ${phone}, ${email}, ${coordinator}, ${pin()}, ${kind}, ${!pending}) returning id`;
      orgId = org.id;
    } catch (e) {
      if (!String(e).includes('coordinator_pin')) throw e;
    }
  }
  let accountId: string | null = null;
  if (pending) {
    // The Google callback already made (or found) the account.
    const [a] = await sql`select id from account where google_sub = ${pending.google_sub}`;
    if (!a) return { error: 'That Google sign-in expired. Continue with Google again.' };
    accountId = a.id;
    await sql`insert into org_member (org_id, account_id, role) values (${orgId}, ${accountId}, 'owner')`;
    await clearPending();
  }
  // Every new org gets a practice event so the course has something to try on.
  const now = new Date();
  await createEvent(orgId!, {
    title: 'Practice event (only you can see this)',
    location: 'Anywhere',
    starts_at: new Date(now.getTime() - 30 * 60_000),
    ends_at: new Date(now.getTime() + 3 * 3_600_000),
    activity: 'general',
    is_practice: true,
  });
  await setOrgCookie(orgId!, accountId);
  redirect('/org?welcome=1');
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get('pin') ?? '').replace(/\D/g, '');
  if (code.length !== 6) return { error: 'Your PIN is 6 digits.' };
  // A 6-digit PIN is guessable, so: 8 tries per 15 minutes per address, and a
  // site-wide ceiling on misses. Orgs that link Google turn their PIN off.
  try {
    await limitByIp('pin', 8, 900);
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
  const [org] = await sql`select id from org where coordinator_pin = ${code} and pin_enabled`;
  if (!org) {
    try {
      await limit('pin:misses', 300, 3600);
    } catch (e) {
      if (e instanceof RateLimitError) return { error: 'PIN sign-in is paused for a few minutes. Use Google instead.' };
      throw e;
    }
    return { error: 'That PIN doesn’t match an organization that signs in with a PIN. Try Google, or set one up.' };
  }
  await setOrgCookie(org.id);
  redirect(safeOrgNext(form.get('next')));
}

export async function signOut() {
  await clearOrgCookie();
  redirect('/');
}

export async function addByName(eventId: string, _: FormState, form: FormData): Promise<FormState> {
  const org = await requireOrg();
  try {
    // Stamped now, on the day, so the "within a day of the event" check doesn't apply.
    await addManual(org.id, eventId, { display_name: String(form.get('name') ?? ''), checked_in_at: new Date() }, { checkWindow: false });
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/org/events/${eventId}`);
  return { ok: 'Checked in.' };
}

export async function addPracticeVolunteer(eventId: string) {
  const org = await requireOrg();
  // Pretend people only ever go on this org's own practice event.
  const event = await getEvent(org.id, eventId);
  if (!event?.is_practice || event.attested_at) return;
  const [{ n }] = await sql`select count(*)::int as n from attendance where event_id = ${eventId}`;
  const minutesAgo = 20 + Math.floor(Math.random() * 40);
  await addManual(
    org.id,
    eventId,
    {
      display_name: PRACTICE_NAMES[n % PRACTICE_NAMES.length] + (n >= PRACTICE_NAMES.length ? ` ${Math.floor(n / PRACTICE_NAMES.length) + 1}` : ''),
      checked_in_at: new Date(Date.now() - minutesAgo * 60_000),
    },
    { checkWindow: false },
  );
  revalidatePath(`/org/events/${eventId}`);
}

export async function checkOutNow(eventId: string, attendanceId: string) {
  const org = await requireOrg();
  await checkOutAttendance(org.id, attendanceId);
  revalidatePath(`/org/events/${eventId}`);
}

export async function checkOutEveryone(eventId: string) {
  const org = await requireOrg();
  await checkOutAll(org.id, eventId);
  revalidatePath(`/org/events/${eventId}`);
}

export async function verifyEvent(
  eventId: string,
  rows: AttestRow[],
  check: { goal_outcome: 'yes' | 'partly' | 'no' | null; cohort_rating: number | null; outcome_text?: string | null },
): Promise<{ error?: string; issued?: number }> {
  const org = await requireOrg();
  try {
    const { issued } = await attestEvent(org.id, eventId, rows, check);
    revalidatePath('/org', 'layout');
    return { issued };
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message };
    const msg = String(e);
    if (msg.includes('adjustment_needs_reason')) return { error: 'Every changed hour needs a reason.' };
    throw e;
  }
}

export async function signBadge(_: FormState, form: FormData): Promise<FormState> {
  const org = await requireOrg();
  const volunteerId = String(form.get('volunteer_id') ?? '');
  const badge = String(form.get('badge') ?? '') as BadgeKey;
  const note = String(form.get('note') ?? '').trim();
  const def = badgeByKey[badge];
  if (!def) return { error: 'Unknown badge.' };
  if (def.needsNote && note.length < 10) return { error: `Add a short note: ${def.needsNote.toLowerCase()}.` };
  // Only someone who served with this org and meets the badge's rule (from verified hours) can be signed.
  const ins = await loadOrgInsights(org.id);
  if (!ins.badgeReady.some((r) => r.v.volunteer_id === volunteerId && r.badge === badge)) {
    return { error: 'This volunteer doesn’t meet that badge’s rule with your organization yet.' };
  }
  await sql`
    insert into badge_award (org_id, volunteer_id, badge, evidence_note, signed_by)
    values (${org.id}, ${volunteerId}, ${badge}, ${note || null}, ${org.coordinator_name})
    on conflict do nothing`;
  await markLesson(org.id, 'badge_signed');
  revalidatePath('/org', 'layout');
  return { ok: `${def.name} signed.` };
}

/** Signs every ready badge whose rule needs no written note (the others need the coordinator's words). */
export async function signAllBadges(_: FormState, form: FormData): Promise<FormState> {
  void form;
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const rows = ins.badgeReady.filter((r) => r.v.volunteer_id && !badgeByKey[r.badge].needsNote);
  if (!rows.length) return { error: 'Nothing to sign without a note.' };
  for (const r of rows) {
    await sql`
      insert into badge_award (org_id, volunteer_id, badge, evidence_note, signed_by)
      values (${org.id}, ${r.v.volunteer_id}, ${r.badge}, null, ${org.coordinator_name})
      on conflict do nothing`;
  }
  await markLesson(org.id, 'badge_signed');
  revalidatePath('/org', 'layout');
  return { ok: `${rows.length} ${rows.length === 1 ? 'badge' : 'badges'} signed.` };
}

export async function completeLesson(key: LessonKey) {
  const org = await requireOrg();
  await markLesson(org.id, key);
  revalidatePath('/org', 'layout');
}
