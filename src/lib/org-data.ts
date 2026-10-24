import 'server-only';
import { sql } from './db';
import { checkinCode } from './codes';
import { hoursBetween } from './hours';
import type { Activity, AttendanceRow, EventRow, Role } from './types';
import type { LessonKey } from './course';

// Organization-side writes. Shared by the server actions (the UI) and the
// /api/org/* routes in the contract, so both paths enforce the same rules.

export class RuleError extends Error {}

export async function markLesson(orgId: string, key: LessonKey) {
  await sql`
    update org set course = course || jsonb_build_object(${key}::text, now()::text)
    where id = ${orgId} and not (course ? ${key})
  `;
}

export async function getEvent(orgId: string, eventId: string) {
  const [event] = (await sql`select * from event where id = ${eventId} and org_id = ${orgId}`) as unknown as EventRow[];
  return event ?? null;
}

export async function getRoster(eventId: string) {
  return (await sql`
    select * from attendance where event_id = ${eventId}
    order by coalesce(checked_in_at, now()) asc, display_name asc
  `) as unknown as AttendanceRow[];
}

export async function createEvent(
  orgId: string,
  input: { title: string; location: string | null; starts_at: Date; ends_at: Date; activity: Activity; is_practice?: boolean; goal_text?: string | null },
) {
  if (!input.title.trim()) throw new RuleError('Give the event a name.');
  if (!(input.ends_at > input.starts_at)) throw new RuleError('The end time has to be after the start time.');
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [event] = (await sql`
        insert into event (org_id, title, location, starts_at, ends_at, checkin_code, activity, is_practice, goal_text)
        values (${orgId}, ${input.title.trim()}, ${input.location?.trim() || null}, ${input.starts_at}, ${input.ends_at},
                ${checkinCode()}, ${input.activity}, ${input.is_practice ?? false}, ${input.goal_text?.trim() || null})
        returning *
      `) as unknown as EventRow[];
      if (!input.is_practice) await markLesson(orgId, 'event_created');
      return event;
    } catch (e) {
      if (!String(e).includes('checkin_code')) throw e; // retry only on a code collision
    }
  }
  throw new Error('Could not generate a unique check-in code');
}

export async function addManual(
  orgId: string,
  eventId: string,
  input: { display_name: string; checked_in_at: Date; checked_out_at?: Date | null; method?: 'coordinator' | 'paper_import'; ai_confidence?: number | null },
) {
  const event = await getEvent(orgId, eventId);
  if (!event) throw new RuleError('Event not found.');
  if (event.attested_at) throw new RuleError('This event is already verified.');
  if (!input.display_name.trim()) throw new RuleError('Type a name.');
  const out = input.checked_out_at ?? null;
  const [row] = (await sql`
    insert into attendance (event_id, display_name, method, checked_in_at, checked_out_at, hours_captured, status, ai_confidence)
    values (${eventId}, ${input.display_name.trim()}, ${input.method ?? 'coordinator'}, ${input.checked_in_at}, ${out},
            ${hoursBetween(input.checked_in_at, out)}, ${out ? 'checked_out' : 'checked_in'}, ${input.ai_confidence ?? null})
    returning *
  `) as unknown as AttendanceRow[];
  await markLesson(orgId, 'checkin_run');
  return row;
}

export async function checkOutAttendance(orgId: string, attendanceId: string, at = new Date()) {
  const [row] = (await sql`
    update attendance a set checked_out_at = ${at}, status = 'checked_out',
      hours_captured = round(extract(epoch from (${at}::timestamptz - a.checked_in_at)) / 900) * 0.25
    from event e
    where a.id = ${attendanceId} and a.event_id = e.id and e.org_id = ${orgId}
      and a.status = 'checked_in' and a.checked_in_at is not null
    returning a.*
  `) as unknown as AttendanceRow[];
  return row ?? null;
}

// End of the day: everyone still here is checked out now, from their own check-in time.
export async function checkOutAll(orgId: string, eventId: string, at = new Date()) {
  const event = await getEvent(orgId, eventId);
  if (!event || event.attested_at) return 0;
  const rows = await sql`
    update attendance set checked_out_at = ${at}, status = 'checked_out',
      hours_captured = round(extract(epoch from (${at}::timestamptz - checked_in_at)) / 900) * 0.25
    where event_id = ${eventId} and status = 'checked_in' and checked_in_at is not null
    returning id`;
  return rows.length;
}

export type AttestRow = {
  attendance_id: string;
  role: Role;
  hours_adjusted?: number | null;
  adjustment_reason?: string | null;
  no_show?: boolean;
  standout?: boolean;
};

// Close & verify: one transaction. Rejects an adjustment without a reason,
// then locks every row (a trigger refuses later edits) and issues records.
export async function attestEvent(
  orgId: string,
  eventId: string,
  rows: AttestRow[],
  check: { goal_outcome: 'yes' | 'partly' | 'no' | null; cohort_rating: number | null; outcome_text?: string | null },
) {
  const event = await getEvent(orgId, eventId);
  if (!event) throw new RuleError('Event not found.');
  if (event.attested_at) throw new RuleError('This event is already verified.');
  const roster = await getRoster(eventId);
  const byId = new Map(rows.map((r) => [r.attendance_id, r]));

  for (const a of roster) {
    const r = byId.get(a.id);
    if (!r) throw new RuleError(`${a.display_name} is missing from the list. Reload and try again.`);
    if (r.no_show) continue;
    const adjusted = r.hours_adjusted != null && Number(r.hours_adjusted) !== Number(a.hours_captured);
    if (adjusted && !r.adjustment_reason?.trim()) throw new RuleError(`Add a reason for changing ${a.display_name}'s hours.`);
    if (!adjusted && !a.checked_out_at) throw new RuleError(`${a.display_name} never checked out. Enter their hours with a reason, or mark them as a no-show.`);
    if (adjusted && (Number(r.hours_adjusted) < 0 || Number(r.hours_adjusted) > 24)) throw new RuleError(`Hours for ${a.display_name} must be between 0 and 24.`);
  }

  const now = new Date();
  await sql.begin(async (tx) => {
    for (const a of roster) {
      const r = byId.get(a.id)!;
      if (r.no_show) {
        await tx`update attendance set status = 'no_show' where id = ${a.id}`;
        continue;
      }
      const adjusted = r.hours_adjusted != null && Number(r.hours_adjusted) !== Number(a.hours_captured);
      await tx`
        update attendance set
          role = ${r.role},
          standout = ${!!r.standout},
          hours_adjusted = ${adjusted ? Number(r.hours_adjusted) : null},
          adjustment_reason = ${adjusted ? r.adjustment_reason!.trim() : null},
          status = 'attested',
          attested_at = ${now}
        where id = ${a.id}
      `;
      await tx`
        insert into record (attendance_id, volunteer_id, org_id)
        values (${a.id}, ${a.volunteer_id}, ${orgId})
      `;
    }
    await tx`
      update event set status = 'closed', closed_at = coalesce(closed_at, ${now}), attested_at = ${now},
        goal_outcome = ${check.goal_outcome}, cohort_rating = ${check.cohort_rating}, outcome_text = ${check.outcome_text?.trim() || null}
      where id = ${eventId}
    `;
  });
  await markLesson(orgId, 'event_verified');
  return { issued: rows.filter((r) => !r.no_show).length };
}
