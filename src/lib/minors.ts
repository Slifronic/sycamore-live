import 'server-only';
import { sql } from './db';
import { ageOn } from './walkin';

// Volunteers under 18 and messaging. Business model rules: no volunteer-to-
// volunteer visibility on minors' data, so minors are not in event group chats
// (they can't see who's in one, read it or post), and direct messages between
// a coordinator and a minor are off in both directions. One-way announcements
// from the organization (broadcasts, automatic notices) still reach them.
// Enforced here and in lib/messages.ts and lib/event-chat.ts, not just in the UI.

export const MINOR_MESSAGES_OFF = 'Messages with volunteers under 18 are off.';
export const MINOR_CHAT_OFF = 'Event group chats are for volunteers 18 and over.';

// The same age rule as join and walk-in (UTC calendar date, see walkin.ageOn).
const isUnder18 = (dob: string) => ageOn(new Date(`${dob}T00:00:00Z`)) < 18;

/** True for a volunteer under 18. Unknown ids are treated as not minors (callers check existence separately). */
export async function isMinor(volunteerId: string): Promise<boolean> {
  const [r] = (await sql`select to_char(date_of_birth, 'YYYY-MM-DD') as dob from volunteer where id = ${volunteerId}`) as unknown as { dob: string }[];
  return !!r && isUnder18(r.dob);
}

/** The subset of these volunteer ids who are under 18. */
export async function minorIds(volunteerIds: string[]): Promise<Set<string>> {
  if (volunteerIds.length === 0) return new Set();
  const rows = (await sql`select id, to_char(date_of_birth, 'YYYY-MM-DD') as dob from volunteer where id = any(${volunteerIds})`) as unknown as { id: string; dob: string }[];
  return new Set(rows.filter((r) => isUnder18(r.dob)).map((r) => r.id));
}

/** SQL condition: the volunteer row aliased `alias` is 18 or older today (UTC). */
export const adultSql = (alias: string) => sql`${sql(alias)}.date_of_birth <= ((now() at time zone 'UTC')::date - interval '18 years')::date`;
