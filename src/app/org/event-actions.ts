'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { requireOrg } from '@/lib/session';
import { createEvent, getEvent, RuleError } from '@/lib/org-data';
import { parsePlace, saveIntakeFields, setEventTags } from '@/lib/event-intake';
import { HHMM, YMD, pacificToUtc } from '@/lib/tz';
import { ACTIVITY_LABEL, type Activity } from '@/lib/types';
import type { IntakeSource } from '@/lib/intake-types';
import type { FormState } from './actions';

// Org addition: create and edit events from the full intake form
// (place, notes for volunteers, tags, where the details came from).

const SOURCES: (IntakeSource | 'manual')[] = ['manual', 'ics', 'feed', 'link', 'text', 'image', 'repeat'];

function readForm(form: FormData) {
  const date = String(form.get('date') ?? '');
  const start = String(form.get('start') ?? '');
  const end = String(form.get('end') ?? '');
  if (!YMD.test(date) || !HHMM.test(start) || !HHMM.test(end)) return { error: 'Pick a date, a start time and an end time.' } as const;
  const starts_at = pacificToUtc(date, start);
  let ends_at = pacificToUtc(date, end);
  // An end time before the start means the shift runs past midnight.
  if (ends_at <= starts_at) ends_at = new Date(ends_at.getTime() + 86_400_000);
  if (ends_at.getTime() - starts_at.getTime() > 16 * 3_600_000) return { error: 'That’s over 16 hours. Split it into shifts, one event each.' } as const;
  const activityRaw = String(form.get('activity') ?? 'general');
  const source = String(form.get('source') ?? 'manual') as IntakeSource | 'manual';
  return {
    title: String(form.get('title') ?? '').trim().slice(0, 120),
    starts_at,
    ends_at,
    activity: (activityRaw in ACTIVITY_LABEL ? activityRaw : 'general') as Activity,
    goal_text: String(form.get('goal') ?? '').trim().slice(0, 200) || null,
    place: parsePlace(String(form.get('place') ?? '') || null),
    location_text: String(form.get('location') ?? '').trim().slice(0, 200) || null,
    notes: String(form.get('notes') ?? '') || null,
    tags: form.getAll('tags').map(String),
    source: SOURCES.includes(source) ? source : 'manual',
    source_uid: String(form.get('source_uid') ?? '').slice(0, 300) || null,
    use_for_site: form.get('use_for_site') === 'on',
  };
}

export async function createEventFull(_: FormState, form: FormData): Promise<FormState> {
  const org = await requireOrg();
  const f = readForm(form);
  if ('error' in f) return { error: f.error };
  let id: string;
  try {
    const ev = await createEvent(org.id, { title: f.title, location: f.place?.name ?? f.location_text, starts_at: f.starts_at, ends_at: f.ends_at, activity: f.activity, goal_text: f.goal_text });
    id = ev.id;
    await saveIntakeFields(org.id, id, f);
    await setEventTags(org.id, id, f.tags);
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message };
    throw e;
  }
  redirect(`/org/events/${id}?created=1`);
}

export async function updateEventFull(eventId: string, _: FormState, form: FormData): Promise<FormState> {
  const org = await requireOrg();
  const event = await getEvent(org.id, eventId);
  if (!event) return { error: 'Event not found.' };
  if (event.attested_at) return { error: 'This event is verified, so its details are locked. They’re printed on volunteers’ records.' };
  const f = readForm(form);
  if ('error' in f) return { error: f.error };
  if (!f.title) return { error: 'Give the event a name.' };
  await sql`
    update event set title = ${f.title}, starts_at = ${f.starts_at}, ends_at = ${f.ends_at},
      activity = ${f.activity}, goal_text = ${f.goal_text}
    where id = ${eventId} and org_id = ${org.id} and attested_at is null`;
  await saveIntakeFields(org.id, eventId, { ...f, source: event.source ?? 'manual', source_uid: event.source_uid ?? null });
  await setEventTags(org.id, eventId, f.tags);
  revalidatePath(`/org/events/${eventId}`);
  redirect(`/org/events/${eventId}?saved=1`);
}
