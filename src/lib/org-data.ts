import 'server-only';
import type postgres from 'postgres';
import { sql } from './db';
import { checkinCode } from './codes';
import { hoursBetween } from './hours';
import { isUuid } from './ids';
import { ACTIVITY_LABEL, ROLE_LABEL, type Activity, type AttendanceRow, type EventRow, type Role } from './types';
import type { LessonKey } from './course';

// Organization-side writes. Shared by the server actions (the UI) and the
// /api/org/* routes in the contract, so both paths enforce the same rules.

/** A rule the coordinator broke. `status` is what an API route answers with. */
export class RuleError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 = 400) {
    super(message);
  }
}
export const notFoundError = () => new RuleError('Event not found.', 404);
export const verifiedError = () => new RuleError('This event is already verified.', 409);

/** The pool, or the transaction a caller already opened. */
type Db = postgres.Sql | postgres.TransactionSql;

export const MAX_EVENT_HOURS = 16;
const DAY_MS = 86_400_000;
const isActivity = (a: unknown): a is Activity => typeof a === 'string' && Object.hasOwn(ACTIVITY_LABEL, a);
const isRole = (r: unknown): r is Role => typeof r === 'string' && Object.hasOwn(ROLE_LABEL, r);
const validDate = (d: Date | null | undefined): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

export async function markLesson(orgId: string, key: LessonKey, db: Db = sql) {
  await db`
    update org set course = course || jsonb_build_object(${key}::text, now()::text)
    where id = ${orgId} and not (course ? ${key})
  `;
}

export async function getEvent(orgId: string, eventId: string) {
  if (!isUuid(eventId)) return null;
  const [event] = (await sql`select * from event where id = ${eventId} and org_id = ${orgId}`) as unknown as EventRow[];
  return event ?? null;
}

export async function getRoster(eventId: string, db: Db = sql) {
  return (await db`
    select a.*, coalesce(v.signup_event_id = a.event_id, false) as new_signup
    from attendance a left join volunteer v on v.id = a.volunteer_id
    where a.event_id = ${eventId}
    order by coalesce(a.checked_in_at, now()) asc, a.display_name asc
  `) as unknown as AttendanceRow[];
}

export async function createEvent(
  orgId: string,
  input: { title: string; location: string | null; starts_at: Date; ends_at: Date; activity: Activity; is_practice?: boolean; goal_text?: string | null },
) {
  if (!input.title.trim()) throw new RuleError('Give the event a name.');
  if (!validDate(input.starts_at) || !validDate(input.ends_at)) throw new RuleError('Give a valid start and end time.');
  if (!(input.ends_at > input.starts_at)) throw new RuleError('The end time has to be after the start time.');
  if (input.ends_at.getTime() - input.starts_at.getTime() > MAX_EVENT_HOURS * 3_600_000)
    throw new RuleError(`That’s over ${MAX_EVENT_HOURS} hours. Split it into shifts, one event each.`);
  if (!isActivity(input.activity)) throw new RuleError('Unknown activity.');
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

// `checkWindow`: times typed or imported by the coordinator must fall within a
// day of the event. The live "Add by name" button stamps now, so it skips it.
export async function addManual(
  orgId: string,
  eventId: string,
  input: { display_name: string; checked_in_at: Date; checked_out_at?: Date | null; method?: 'coordinator' | 'paper_import'; ai_confidence?: number | null },
  opts: { db?: Db; checkWindow?: boolean } = {},
) {
  const db = opts.db ?? sql;
  if (!isUuid(eventId)) throw notFoundError();
  // `for share`: an attest running at the same moment waits for this row, or this waits for it.
  const [event] = (await db`select * from event where id = ${eventId} and org_id = ${orgId} for share`) as unknown as EventRow[];
  if (!event) throw notFoundError();
  if (event.attested_at) throw verifiedError();
  const name = typeof input.display_name === 'string' ? input.display_name.trim() : '';
  if (!name) throw new RuleError('Type a name.');
  if (name.length > 120) throw new RuleError('Keep the name under 120 characters.');
  const inAt = input.checked_in_at;
  const out = input.checked_out_at ?? null;
  if (!validDate(inAt)) throw new RuleError(`${name}: the time in isn’t a valid date.`);
  if (out && !validDate(out)) throw new RuleError(`${name}: the time out isn’t a valid date.`);
  if (out && out < inAt) throw new RuleError(`${name}: the time out is before the time in.`);
  if (opts.checkWindow !== false) {
    const from = new Date(event.starts_at).getTime() - DAY_MS;
    const to = new Date(event.ends_at).getTime() + DAY_MS;
    for (const t of [inAt, out]) {
      if (t && (t.getTime() < from || t.getTime() > to)) throw new RuleError(`${name}: that time is more than a day outside the event.`);
    }
  }
  const [row] = (await db`
    insert into attendance (event_id, display_name, method, checked_in_at, checked_out_at, hours_captured, status, ai_confidence)
    values (${eventId}, ${name}, ${input.method ?? 'coordinator'}, ${inAt}, ${out},
            ${hoursBetween(inAt, out)}, ${out ? 'checked_out' : 'checked_in'}, ${input.ai_confidence ?? null})
    returning *
  `) as unknown as AttendanceRow[];
  await markLesson(orgId, 'checkin_run', db);
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

const GOALS = ['yes', 'partly', 'no'] as const;
const isQuarter = (h: number) => Math.abs(h * 4 - Math.round(h * 4)) < 1e-9;

/** Hours the coordinator typed: a finite number from 0 to 24 in quarter-hour steps, or null for "not changed". */
function readHours(v: unknown, name: string): number | null {
  if (v == null || v === '') return null;
  const h = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN;
  if (!Number.isFinite(h) || h < 0 || h > 24) throw new RuleError(`Hours for ${name} must be a number between 0 and 24.`);
  if (!isQuarter(h)) throw new RuleError(`Hours for ${name} go in quarter hours (for example 2.25 or 2.5).`);
  return h;
}

// Close & verify: one transaction. The event row is locked first, so a second
// attest waits and then sees "already verified". Rejects an adjustment without
// a reason, then locks every row (a trigger refuses later edits) and issues records.
export async function attestEvent(
  orgId: string,
  eventId: string,
  rows: AttestRow[],
  check: { goal_outcome: 'yes' | 'partly' | 'no' | null; cohort_rating: number | null; outcome_text?: string | null },
) {
  if (!isUuid(eventId)) throw notFoundError();
  if (!Array.isArray(rows) || rows.some((r) => !r || typeof r !== 'object')) throw new RuleError('Send rows as a list.');
  if (check.goal_outcome != null && !GOALS.includes(check.goal_outcome)) throw new RuleError('The goal answer must be yes, partly or no.');
  const rating = check.cohort_rating;
  if (rating != null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) throw new RuleError('The cohort rating must be a whole number from 1 to 5.');
  if (check.outcome_text != null && typeof check.outcome_text !== 'string') throw new RuleError('The outcome must be text.');
  const byId = new Map(rows.map((r) => [r.attendance_id, r]));

  const issued = await sql.begin(async (tx) => {
    const [event] = (await tx`select * from event where id = ${eventId} and org_id = ${orgId} for update`) as unknown as EventRow[];
    if (!event) throw notFoundError();
    if (event.attested_at) throw verifiedError();
    const roster = await getRoster(eventId, tx);

    const plan = roster.map((a) => {
      const r = byId.get(a.id);
      if (!r) throw new RuleError(`${a.display_name} is missing from the list. Reload and try again.`);
      if (r.no_show) return { a, r, hours: null };
      if (!isRole(r.role)) throw new RuleError(`Pick a role for ${a.display_name}.`);
      const typed = readHours(r.hours_adjusted, a.display_name);
      const adjusted = typed != null && typed !== Number(a.hours_captured);
      if (adjusted && !r.adjustment_reason?.trim()) throw new RuleError(`Add a reason for changing ${a.display_name}'s hours.`);
      if (!adjusted && !a.checked_out_at) throw new RuleError(`${a.display_name} never checked out. Enter their hours with a reason, or mark them as a no-show.`);
      if (!adjusted && a.checked_in_at && a.checked_out_at && new Date(a.checked_out_at) < new Date(a.checked_in_at))
        throw new RuleError(`${a.display_name}'s time out is before their time in. Enter their hours with a reason, or mark them as a no-show.`);
      return { a, r, hours: adjusted ? typed : null };
    });

    const now = new Date();
    for (const { a, r, hours } of plan) {
      if (r.no_show) {
        await tx`update attendance set status = 'no_show', location_opt_in = false, last_ping_at = null, outside_since = null, left_area_at = null, left_area_m = null where id = ${a.id}`;
        continue;
      }
      await tx`
        update attendance set
          role = ${r.role},
          standout = ${!!r.standout},
          hours_adjusted = ${hours},
          adjustment_reason = ${hours != null ? r.adjustment_reason!.trim() : null},
          status = 'attested',
          attested_at = ${now},
          -- the leave-the-area suggestion has done its job; keep no trace of it
          location_opt_in = false, last_ping_at = null, outside_since = null, left_area_at = null, left_area_m = null
        where id = ${a.id}
      `;
      await tx`
        insert into record (attendance_id, volunteer_id, org_id)
        values (${a.id}, ${a.volunteer_id}, ${orgId})
      `;
    }
    await tx`
      update event set status = 'closed', closed_at = coalesce(closed_at, ${now}), attested_at = ${now},
        goal_outcome = ${check.goal_outcome}, cohort_rating = ${rating}, outcome_text = ${check.outcome_text?.trim() || null}
      where id = ${eventId}
    `;
    return plan.filter((p) => !p.r.no_show).length;
  });
  await markLesson(orgId, 'event_verified');
  return { issued };
}
