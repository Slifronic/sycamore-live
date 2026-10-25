'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { pin } from '@/lib/codes';
import { clearOrgCookie, requireOrg, setOrgCookie } from '@/lib/session';
import { addManual, attestEvent, checkOutAll, checkOutAttendance, createEvent, getEvent, markLesson, RuleError, type AttestRow } from '@/lib/org-data';
import { loadOrgInsights } from '@/lib/insights';
import { badgeByKey, type BadgeKey } from '@/lib/badges';
import type { Activity } from '@/lib/types';
import type { LessonKey } from '@/lib/course';

export type FormState = { error?: string; ok?: string } | null;

const PRACTICE_NAMES = ['Ana Practice', 'Ben Practice', 'Cleo Practice', 'Dev Practice', 'Eli Practice', 'Fay Practice'];


export async function startOrg(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get('name') ?? '').trim();
  const coordinator = String(form.get('coordinator') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const phone = String(form.get('phone') ?? '').trim();
  const kind = form.get('kind') === 'school' ? 'school' : 'nonprofit';
  if (!name || !coordinator || !email || !phone) return { error: 'Fill in all four boxes. They print on every record you issue.' };

  let orgId: string | null = null;
  for (let i = 0; i < 5 && !orgId; i++) {
    try {
      const [org] = await sql`
        insert into org (name, contact_phone, contact_email, coordinator_name, coordinator_pin, kind)
        values (${name}, ${phone}, ${email}, ${coordinator}, ${pin()}, ${kind}) returning id`;
      orgId = org.id;
    } catch (e) {
      if (!String(e).includes('coordinator_pin')) throw e;
    }
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
  await setOrgCookie(orgId!);
  redirect('/org?welcome=1');
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get('pin') ?? '').replace(/\D/g, '');
  if (code.length !== 6) return { error: 'Your PIN is 6 digits.' };
  const [org] = await sql`select id from org where coordinator_pin = ${code}`;
  if (!org) return { error: 'That PIN doesn’t match an organization. Check the welcome email or set one up.' };
  await setOrgCookie(org.id);
  redirect('/org');
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
