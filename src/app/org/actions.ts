'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { pin } from '@/lib/codes';
import { clearOrgCookie, requireOrg, setOrgCookie } from '@/lib/session';
import { addManual, attestEvent, checkOutAttendance, createEvent, markLesson, RuleError, type AttestRow } from '@/lib/org-data';
import { badgeByKey, type BadgeKey } from '@/lib/badges';
import type { Activity } from '@/lib/types';
import type { LessonKey } from '@/lib/course';

export type FormState = { error?: string; ok?: string } | null;

const PRACTICE_NAMES = ['Ana Practice', 'Ben Practice', 'Cleo Practice', 'Dev Practice', 'Eli Practice', 'Fay Practice'];

// Local wall-clock time from a <input type="datetime-local"> in Pacific time.
function pacific(value: string): Date {
  return new Date(`${value}:00-07:00`);
}

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

export async function newEvent(_: FormState, form: FormData): Promise<FormState> {
  const org = await requireOrg();
  const date = String(form.get('date') ?? '');
  const start = String(form.get('start') ?? '');
  const end = String(form.get('end') ?? '');
  if (!date || !start || !end) return { error: 'Pick a date, a start time and an end time.' };
  let id: string;
  try {
    const ev = await createEvent(org.id, {
      title: String(form.get('title') ?? ''),
      location: String(form.get('location') ?? '') || null,
      starts_at: pacific(`${date}T${start}`),
      ends_at: pacific(`${date}T${end}`),
      activity: (String(form.get('activity') ?? 'general') as Activity) || 'general',
    });
    id = ev.id;
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message };
    throw e;
  }
  redirect(`/org/events/${id}?created=1`);
}

export async function addByName(eventId: string, _: FormState, form: FormData): Promise<FormState> {
  const org = await requireOrg();
  try {
    await addManual(org.id, eventId, { display_name: String(form.get('name') ?? ''), checked_in_at: new Date() });
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/org/events/${eventId}`);
  return { ok: 'Checked in.' };
}

export async function addPracticeVolunteer(eventId: string) {
  const org = await requireOrg();
  const [{ n }] = await sql`select count(*)::int as n from attendance where event_id = ${eventId}`;
  const minutesAgo = 20 + Math.floor(Math.random() * 40);
  await addManual(org.id, eventId, {
    display_name: PRACTICE_NAMES[n % PRACTICE_NAMES.length] + (n >= PRACTICE_NAMES.length ? ` ${Math.floor(n / PRACTICE_NAMES.length) + 1}` : ''),
    checked_in_at: new Date(Date.now() - minutesAgo * 60_000),
  });
  revalidatePath(`/org/events/${eventId}`);
}

export async function checkOutNow(eventId: string, attendanceId: string) {
  const org = await requireOrg();
  await checkOutAttendance(org.id, attendanceId);
  revalidatePath(`/org/events/${eventId}`);
}

export async function verifyEvent(
  eventId: string,
  rows: AttestRow[],
  check: { goal_outcome: 'yes' | 'partly' | 'no' | null; cohort_rating: number | null },
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
  await sql`
    insert into badge_award (org_id, volunteer_id, badge, evidence_note, signed_by)
    values (${org.id}, ${volunteerId}, ${badge}, ${note || null}, ${org.coordinator_name})
    on conflict do nothing`;
  await markLesson(org.id, 'badge_signed');
  revalidatePath('/org', 'layout');
  return { ok: `${def.name} signed.` };
}

export async function completeLesson(key: LessonKey) {
  const org = await requireOrg();
  await markLesson(org.id, key);
  revalidatePath('/org', 'layout');
}
