import 'server-only';
import { randomBytes } from 'node:crypto';
import { sql } from './db';
import type { AttendanceRow, EventRow, Org } from './types';
import type { GoogleIdentity } from './google';

// Walk-in sign-up: someone who has never used SycaMore turns up at an event.
// They scan the event's walk-in QR, sign up with Google or three fields, and
// are checked in to that event in the same step. The link only works while
// the event is on (see walkinState), and the coordinator can turn it off or
// replace it at any time.

const HOUR = 3_600_000;
export const WALKIN_EARLY_MS = 2 * HOUR; // opens 2 hours before the start
export const WALKIN_GRACE_MS = 2 * HOUR; // closes 2 hours after the end, unless set

export type WalkinState = 'open' | 'not_yet' | 'expired' | 'off' | 'verified';

export class WalkinError extends Error {
  constructor(message: string, readonly status: number, readonly need?: 'date_of_birth') {
    super(message);
  }
}

export function walkinToken(): string {
  return randomBytes(16).toString('base64url'); // 128 bits: not guessable, not enumerable
}

export function walkinWindow(e: Pick<EventRow, 'starts_at' | 'ends_at' | 'walkin_until'>) {
  return {
    opens: new Date(new Date(e.starts_at).getTime() - WALKIN_EARLY_MS),
    closes: e.walkin_until ? new Date(e.walkin_until) : new Date(new Date(e.ends_at).getTime() + WALKIN_GRACE_MS),
  };
}

export function walkinState(e: Pick<EventRow, 'starts_at' | 'ends_at' | 'walkin_until' | 'walkin_open' | 'attested_at' | 'status'>, now = Date.now()): WalkinState {
  if (e.attested_at || e.status === 'closed') return 'verified';
  if (!e.walkin_open) return 'off';
  const { opens, closes } = walkinWindow(e);
  if (now < opens.getTime()) return 'not_yet';
  if (now > closes.getTime()) return 'expired';
  return 'open';
}

// The coordinator's event page asks for the token; old events get one lazily.
export async function ensureWalkinToken(orgId: string, eventId: string): Promise<string | null> {
  const [row] = (await sql`
    update event set walkin_token = coalesce(walkin_token, ${walkinToken()})
    where id = ${eventId} and org_id = ${orgId}
    returning walkin_token`) as unknown as { walkin_token: string }[];
  return row?.walkin_token ?? null;
}

export async function updateWalkin(orgId: string, eventId: string, change: { open?: boolean; rotate?: boolean }) {
  const [row] = (await sql`
    update event set
      walkin_open = coalesce(${change.open ?? null}::boolean, walkin_open),
      walkin_token = case when ${!!change.rotate}::boolean then ${walkinToken()} else coalesce(walkin_token, ${walkinToken()}) end
    where id = ${eventId} and org_id = ${orgId} and attested_at is null
    returning *`) as unknown as EventRow[];
  return row ?? null;
}

export async function walkinCount(eventId: string): Promise<number> {
  const [row] = (await sql`select count(*)::int as n from attendance where event_id = ${eventId} and method = 'walk_in'`) as unknown as { n: number }[];
  return row?.n ?? 0;
}

export async function eventByWalkinToken(token: string) {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const [event] = (await sql`select * from event where walkin_token = ${token}`) as unknown as EventRow[];
  if (!event) return null;
  const [org] = (await sql`select * from org where id = ${event.org_id}`) as unknown as Org[];
  return org ? { event, org } : null;
}

export function ageOn(dob: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

// Returns the birth date as YYYY-MM-DD, or throws. Under 13 is refused and
// nothing is stored. Kept as a plain date string so no time zone can shift it.
export function checkBirthDate(raw: string | undefined | null): string {
  if (!raw) throw new WalkinError('Add your date of birth.', 422, 'date_of_birth');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new WalkinError('Use the date picker for your date of birth.', 400);
  const dob = new Date(`${raw}T00:00:00Z`);
  const age = Number.isNaN(dob.getTime()) ? -1 : ageOn(dob);
  if (age < 0 || age > 110) throw new WalkinError('That date of birth doesn’t look right.', 400);
  if (age < 13) {
    throw new WalkinError(
      'You need to be 13 or older to sign up. Nothing was saved. Ask the coordinator to add you by name; your time still counts for the event.',
      403,
    );
  }
  return raw;
}

const isoDay = (d: Date) => new Date(d).toISOString().slice(0, 10);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type WalkinWho =
  | { kind: 'returning'; volunteer_id: string }
  | { kind: 'email'; name: string; email: string; date_of_birth?: string | null }
  | { kind: 'google'; identity: GoogleIdentity; date_of_birth?: string | null };

export type WalkinResult = {
  attendance: Pick<AttendanceRow, 'id' | 'status' | 'checked_in_at' | 'checked_out_at'>;
  volunteer: { id: string; name: string };
  is_minor: boolean;
  is_new: boolean;   // this sign-up created the volunteer
  already: boolean;  // they were already on this event's roster
};

type Vol = { id: string; name: string; date_of_birth: Date; google_sub: string | null };

export async function walkInCheckIn(token: string, who: WalkinWho): Promise<WalkinResult & { event: EventRow; org: Org }> {
  const found = await eventByWalkinToken(token);
  if (!found) throw new WalkinError('This sign-up link isn’t valid any more. Ask the coordinator for the current QR code.', 404);
  const { event, org } = found;
  const state = walkinState(event);
  if (state !== 'open') throw new WalkinError(STATE_MESSAGE[state](org.coordinator_name), 410);

  // Find or create the volunteer. An existing account is never overwritten.
  let vol: Vol | undefined;
  let isNew = false;
  if (who.kind === 'returning') {
    [vol] = (await sql`select id, name, date_of_birth, google_sub from volunteer where id = ${who.volunteer_id}`) as unknown as Vol[];
    if (!vol) throw new WalkinError('We couldn’t find your sign-up. Sign up again below.', 401);
  } else {
    const email = (who.kind === 'google' ? who.identity.email : who.email).trim().toLowerCase();
    if (!EMAIL.test(email)) throw new WalkinError('That email doesn’t look right.', 400);
    if (who.kind === 'google') {
      [vol] = (await sql`
        select id, name, date_of_birth, google_sub from volunteer
        where google_sub = ${who.identity.sub} or email = ${email}
        order by (google_sub = ${who.identity.sub}) desc nulls last limit 1`) as unknown as Vol[];
      // Google has confirmed this email, so link it to the existing account.
      if (vol && !vol.google_sub) await sql`update volunteer set google_sub = ${who.identity.sub} where id = ${vol.id}`;
    } else {
      // An existing email signs that person back in only with the birth date
      // they signed up with, so typing someone else's email doesn't open their
      // record or messages. (Still demo-grade: real auth is a magic link.)
      [vol] = (await sql`select id, name, date_of_birth, google_sub from volunteer where email = ${email}`) as unknown as Vol[];
      if (vol && isoDay(vol.date_of_birth) !== checkBirthDate(who.date_of_birth)) {
        throw new WalkinError(
          vol.google_sub
            ? 'That email is already signed up with Google. Tap “Continue with Google” instead.'
            : 'That email is already signed up, with a different date of birth. Check it, or ask the coordinator to add you by name.',
          409,
        );
      }
    }
    if (!vol) {
      const name = (who.kind === 'google' ? who.identity.name : who.name).trim().replace(/\s+/g, ' ');
      if (name.length < 2) throw new WalkinError('Add your name, the way you want it on your record.', 400);
      if (name.length > 80) throw new WalkinError('That name is too long.', 400);
      const dob = checkBirthDate(who.date_of_birth);
      [vol] = (await sql`
        insert into volunteer (name, email, date_of_birth, google_sub, signup_method, signup_event_id)
        values (${name}, ${email}, ${dob}, ${who.kind === 'google' ? who.identity.sub : null},
                ${who.kind === 'google' ? 'walk_in_google' : 'walk_in_email'}, ${event.id})
        returning id, name, date_of_birth, google_sub`) as unknown as Vol[];
      isNew = true;
    }
  }

  // Check in to this event, once.
  let [att] = (await sql`
    insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, status)
    values (${event.id}, ${vol!.id}, ${vol!.name}, 'walk_in', now(), 'checked_in')
    on conflict (event_id, volunteer_id) do nothing
    returning id, status, checked_in_at, checked_out_at`) as unknown as WalkinResult['attendance'][];
  const already = !att;
  if (!att) {
    [att] = (await sql`
      select id, status, checked_in_at, checked_out_at from attendance
      where event_id = ${event.id} and volunteer_id = ${vol!.id}`) as unknown as WalkinResult['attendance'][];
  }

  return {
    event,
    org,
    attendance: att!,
    volunteer: { id: vol!.id, name: vol!.name },
    is_minor: ageOn(new Date(vol!.date_of_birth)) < 18,
    is_new: isNew,
    already,
  };
}

export const STATE_MESSAGE: Record<Exclude<WalkinState, 'open'>, (coordinator: string) => string> = {
  not_yet: (c) => `Sign-up for this event opens 2 hours before it starts. If you’re here early, ask ${c}.`,
  expired: (c) => `Sign-up for this event has closed. Ask ${c} to add you by name; your time still counts.`,
  off: (c) => `${c} has turned off sign-up at the door for this event. Ask them to add you by name.`,
  verified: (c) => `This event is over and its hours are confirmed. If you were there and aren’t on the record, contact ${c}.`,
};
