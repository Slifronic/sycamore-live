import 'server-only';
import { redirect } from 'next/navigation';
import { sql } from './db';
import { currentVolunteerId } from './vol-session';
import { ageOn, checkBirthDate, WalkinError } from './walkin';
import { SHARE_CODE, shareCode } from './codes';
import { isUuid } from './ids';
import { fmtDay, fmtTime } from './format';
import { utcToPacific } from './tz';
import type { RecordView, Role } from './types';

// Volunteer side of the shared contract: joining, checking in, "My hours",
// share links and the public record. Every hour number here comes from the
// database (check-in/check-out timestamps, or the coordinator's attested
// adjustment). Nothing a volunteer sends is ever stored as hours.

export class VolError extends Error {
  constructor(message: string, readonly status: number, readonly extra?: Record<string, unknown>) {
    super(message);
  }
}

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ---------- who is this ----------

export type Volunteer = {
  id: string;
  name: string;
  email: string;
  date_of_birth: string; // YYYY-MM-DD
  hours_goal: number | null;
  is_minor: boolean;
};

const minor = (dob: string) => ageOn(new Date(`${dob}T00:00:00Z`)) < 18;

export async function getVolunteer(id: string): Promise<Volunteer | null> {
  if (!isUuid(id)) return null;
  const [v] = (await sql`
    select id, name, email, to_char(date_of_birth, 'YYYY-MM-DD') as date_of_birth, hours_goal
    from volunteer where id = ${id}`) as unknown as Omit<Volunteer, 'is_minor'>[];
  return v ? { ...v, is_minor: minor(v.date_of_birth) } : null;
}

export async function currentVolunteer(): Promise<Volunteer | null> {
  const vid = await currentVolunteerId();
  return vid ? getVolunteer(vid) : null;
}

/** For pages: no `vid` cookie (or a stale one) goes to /join and comes back. */
export async function requireVolunteer(next: string): Promise<Volunteer> {
  const v = await currentVolunteer();
  if (!v) redirect(`/join?next=${encodeURIComponent(next)}`);
  return v;
}

/** Only same-site paths survive a ?next= round trip; anything else goes to /me. */
export function safeNext(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  // Control characters and backslashes are dropped or rewritten by URL parsers
  // ("/\t/evil.com" becomes "//evil.com"), so refuse them outright, then make
  // sure the path still resolves to this site.
  if (!s.startsWith('/') || s.length >= 300 || /[\u0000-\u001f\u007f\\]/.test(s)) return '/me';
  try {
    const u = new URL(s, 'https://sycamore.invalid');
    return u.origin === 'https://sycamore.invalid' ? u.pathname + u.search + u.hash : '/me';
  } catch {
    return '/me';
  }
}

// ---------- join ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function join(input: { name?: unknown; email?: unknown; date_of_birth?: unknown; google?: { sub: string; email: string } | null }) {
  const email = String(input.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) throw new VolError('That email doesn’t look right.', 400);
  let dob: string;
  try {
    // Under 13 is refused here (403) before anything is read or written.
    dob = checkBirthDate(typeof input.date_of_birth === 'string' ? input.date_of_birth : null);
  } catch (e) {
    if (e instanceof WalkinError) {
      const msg = e.status === 403 ? 'You need to be 13 or older to join SycaMore. Nothing was saved.' : e.message;
      throw new VolError(msg, e.status === 422 ? 400 : e.status);
    }
    throw e;
  }

  // An existing email never signs in here: knowing someone's email and
  // birthday isn't proof of owning the account. They sign in with Google or an
  // emailed code instead (/signin).
  const [existing] = await sql`select 1 from volunteer where email = ${email}`;
  if (existing) {
    throw new VolError('That email already has a SycaMore account. Sign in with Google or an emailed code.', 409, { signin: true });
  }

  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < 2) throw new VolError('Add your name, the way you want it on your record.', 400);
  if (name.length > 80) throw new VolError('That name is too long.', 400);
  const g = input.google ?? null;
  if (g && g.email !== email) throw new VolError('Use the email Google confirmed.', 400);
  const [v] = (await sql`
    insert into volunteer (name, email, date_of_birth, signup_method, google_sub, email_verified_at)
    values (${name}, ${email}, ${dob}, 'join', ${g?.sub ?? null}, ${g ? sql`now()` : null})
    on conflict (email) do nothing
    returning id`) as unknown as { id: string }[];
  if (!v) throw new VolError('That email just signed up. Sign in instead.', 409, { signin: true });
  return { volunteer: (await getVolunteer(v.id))!, is_new: true };
}

export async function setGoal(volunteerId: string, raw: unknown) {
  const goal = raw === null || raw === '' ? null : Number(raw);
  if (goal !== null && (!Number.isInteger(goal) || goal < 1 || goal > 2000)) {
    throw new VolError('Pick a whole number of hours between 1 and 2,000.', 400);
  }
  await sql`update volunteer set hours_goal = ${goal} where id = ${volunteerId}`;
  return goal;
}

// ---------- check in ----------

export type ActiveSession = {
  id: string;
  status: 'checked_in';
  checked_in_at: string;
  checked_out_at: null;
  event: { id: string; title: string; location: string | null; starts_at: string; ends_at: string };
  org: { id: string; name: string; coordinator_name: string };
};

type SessionRow = {
  id: string; status: 'checked_in'; checked_in_at: Date; event_id: string; title: string; location: string | null;
  starts_at: Date; ends_at: Date; org_id: string; org_name: string; coordinator_name: string;
};

const toSession = (r: SessionRow): ActiveSession => ({
  id: r.id,
  status: r.status,
  checked_in_at: new Date(r.checked_in_at).toISOString(),
  checked_out_at: null,
  event: { id: r.event_id, title: r.title, location: r.location, starts_at: new Date(r.starts_at).toISOString(), ends_at: new Date(r.ends_at).toISOString() },
  org: { id: r.org_id, name: r.org_name, coordinator_name: r.coordinator_name },
});

export async function activeSession(volunteerId: string): Promise<ActiveSession | null> {
  const [r] = (await sql`
    select a.id, a.status, a.checked_in_at, e.id as event_id, e.title, coalesce(e.place_name, e.location) as location,
           e.starts_at, e.ends_at, o.id as org_id, o.name as org_name, o.coordinator_name
    from attendance a join event e on e.id = a.event_id join org o on o.id = e.org_id
    where a.volunteer_id = ${volunteerId} and a.status = 'checked_in' and a.checked_in_at is not null
      and e.attested_at is null and not e.is_practice
    order by a.checked_in_at desc limit 1`) as unknown as SessionRow[];
  return r ? toSession(r) : null;
}

const HOUR = 3_600_000;
const OPENS_BEFORE = 2 * HOUR; // same window as the walk-in link
const CLOSES_AFTER = 2 * HOUR;

export function normalizeCheckinCode(raw: unknown): string {
  return String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
}

type EventLookup = {
  id: string; title: string; location: string | null; starts_at: Date; ends_at: Date; status: string; attested_at: Date | null;
  org_id: string; org_name: string; coordinator_name: string;
};

/** The event behind a check-in code, for the confirm screen. Practice events never match. */
export async function eventByCheckinCode(raw: unknown): Promise<EventLookup | null> {
  const code = normalizeCheckinCode(raw);
  // New codes avoid 0/O/1/I; older ones (and the seed's) may not, so look up any 6.
  if (!/^[A-Z0-9]{6}$/.test(code)) return null;
  const [e] = (await sql`
    select e.id, e.title, coalesce(e.place_name, e.location) as location, e.starts_at, e.ends_at, e.status, e.attested_at,
           o.id as org_id, o.name as org_name, o.coordinator_name
    from event e join org o on o.id = e.org_id
    where e.checkin_code = ${code} and not e.is_practice`) as unknown as EventLookup[];
  return e ?? null;
}

export function checkinState(e: Pick<EventLookup, 'starts_at' | 'ends_at' | 'status' | 'attested_at'>, now = Date.now()): 'open' | 'not_yet' | 'over' | 'verified' {
  if (e.attested_at || e.status === 'closed') return 'verified';
  if (now < new Date(e.starts_at).getTime() - OPENS_BEFORE) return 'not_yet';
  if (now > new Date(e.ends_at).getTime() + CLOSES_AFTER) return 'over';
  return 'open';
}

export async function checkIn(volunteerId: string, rawCode: unknown, via: unknown) {
  const code = normalizeCheckinCode(rawCode);
  if (!code) throw new VolError('Type the 6-character code from the event.', 400);
  const e = await eventByCheckinCode(code);
  if (!e) throw new VolError('We couldn’t find an event with that code. Check it with the coordinator: codes never use 0, O, 1 or I.', 404);

  const state = checkinState(e);
  if (state === 'verified') throw new VolError(`${e.title} is over and its hours are confirmed. If you were there and aren’t on the record, contact ${e.coordinator_name}.`, 410);
  if (state === 'over') throw new VolError(`Check-in for ${e.title} has closed. Ask ${e.coordinator_name} to add you by name; your time still counts.`, 410);
  if (state === 'not_yet') {
    const opens = new Date(new Date(e.starts_at).getTime() - OPENS_BEFORE);
    throw new VolError(`Check-in for ${e.title} opens ${fmtDay(opens)} at ${fmtTime(opens)}, 2 hours before it starts.`, 409);
  }

  const elsewhere = await activeSession(volunteerId);
  if (elsewhere && elsewhere.event.id !== e.id) {
    throw new VolError(`You’re still checked in at ${elsewhere.event.title}. Check out there first.`, 409, { attendance: elsewhere });
  }

  const [vol] = (await sql`select name from volunteer where id = ${volunteerId}`) as unknown as { name: string }[];
  if (!vol) throw new VolError('Join first.', 401);
  const method = via === 'qr' ? 'qr' : 'code';
  const [att] = (await sql`
    insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, status)
    values (${e.id}, ${volunteerId}, ${vol.name}, ${method}, now(), 'checked_in')
    on conflict (event_id, volunteer_id) do nothing
    returning id`) as unknown as { id: string }[];
  if (!att) {
    const [prev] = (await sql`
      select status, checked_out_at from attendance where event_id = ${e.id} and volunteer_id = ${volunteerId}`) as unknown as {
      status: string; checked_out_at: Date | null;
    }[];
    if (prev?.status === 'checked_in') throw new VolError('You’re already checked in to this event.', 409, { attendance: await activeSession(volunteerId) });
    throw new VolError(
      prev?.checked_out_at
        ? `You already checked out of ${e.title} at ${fmtTime(prev.checked_out_at)}. If that’s wrong, tell ${e.coordinator_name}; only the coordinator can change hours.`
        : `You’re already on the roster for ${e.title}. Ask ${e.coordinator_name} if something looks wrong.`,
      409,
    );
  }
  const session = (await activeSession(volunteerId))!;
  return {
    attendance: { id: session.id, status: session.status, checked_in_at: session.checked_in_at, checked_out_at: null, method },
    event: session.event,
    org: session.org,
  };
}

// ---------- records ----------

export type VolRecord = RecordView & {
  event_id: string;
  starts_at: string;
  shared_at: string | null;
  org_id: string;
};

type RecordRow = {
  id: string; code: string | null; status: 'active' | 'revoked'; shared_at: Date | null; volunteer_name: string;
  org_id: string; org_name: string; contact_phone: string; contact_email: string; coordinator_name: string;
  org_reviewed: boolean; owner_email: string | null;
  event_id: string; title: string; location: string | null; starts_at: Date;
  role: Role; hours_captured: number; hours_adjusted: number | null; adjustment_reason: string | null; attested_at: Date | null; issued_at: Date;
};

// Free mail domains say nothing about which organization someone works for.
const PERSONAL = new Set(['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'live.com']);
const orgDomain = (email: string | null) => {
  const d = email?.split('@')[1]?.toLowerCase();
  return d && !PERSONAL.has(d) ? d : null;
};

const toRecord = (r: RecordRow): VolRecord => ({
  id: r.id,
  code: r.code,
  status: r.status,
  volunteer_name: r.volunteer_name,
  org: { name: r.org_name, contact_phone: r.contact_phone, contact_email: r.contact_email, reviewed: r.org_reviewed, verified_domain: orgDomain(r.owner_email) },
  event: { title: r.title, location: r.location, date: utcToPacific(new Date(r.starts_at)).ymd },
  role: r.role,
  hours_total: Number(r.hours_adjusted ?? r.hours_captured),
  hours_captured: Number(r.hours_captured),
  hours_adjusted: r.hours_adjusted == null ? null : Number(r.hours_adjusted),
  // The coordinator who attested the event is the one who signs off any change.
  adjusted_by: r.hours_adjusted == null ? null : r.coordinator_name,
  adjustment_reason: r.hours_adjusted == null ? null : r.adjustment_reason,
  attested_at: new Date(r.attested_at ?? r.issued_at).toISOString(),
  event_id: r.event_id,
  starts_at: new Date(r.starts_at).toISOString(),
  shared_at: r.shared_at ? new Date(r.shared_at).toISOString() : null,
  org_id: r.org_id,
});

const recordSelect = () => sql`
  select r.id, r.code, r.status, r.shared_at, r.issued_at, coalesce(v.name, a.display_name) as volunteer_name,
         o.id as org_id, o.name as org_name, o.contact_phone, o.contact_email, o.coordinator_name,
         o.reviewed_at is not null as org_reviewed,
         (select a2.email from org_member m join account a2 on a2.id = m.account_id
          where m.org_id = o.id and m.role = 'owner' order by m.created_at limit 1) as owner_email,
         e.id as event_id, e.title, coalesce(e.place_name, e.location) as location, e.starts_at,
         a.role, a.hours_captured, a.hours_adjusted, a.adjustment_reason, a.attested_at
  from record r
  join attendance a on a.id = r.attendance_id
  join event e on e.id = a.event_id
  join org o on o.id = r.org_id
  left join volunteer v on v.id = r.volunteer_id`;

/** A volunteer's own attested records, newest event first. Practice events never count. */
export async function volunteerRecords(volunteerId: string): Promise<VolRecord[]> {
  const rows = (await sql`${recordSelect()}
    where r.volunteer_id = ${volunteerId} and a.status = 'attested' and not e.is_practice
    order by e.starts_at desc`) as unknown as RecordRow[];
  return rows.map(toRecord);
}

export async function volunteerRecord(volunteerId: string, recordId: string): Promise<VolRecord | null> {
  if (!isUuid(recordId)) return null;
  const [r] = (await sql`${recordSelect()}
    where r.id = ${recordId} and r.volunteer_id = ${volunteerId} and not e.is_practice`) as unknown as RecordRow[];
  return r ? toRecord(r) : null;
}

/** Public lookup for /v/<code>: only shared records have a code. */
export async function recordByCode(raw: string): Promise<VolRecord | null> {
  const code = String(raw ?? '').toUpperCase();
  if (!SHARE_CODE.test(code)) return null;
  const [r] = (await sql`${recordSelect()} where r.code = ${code} and not e.is_practice`) as unknown as RecordRow[];
  return r ? toRecord(r) : null;
}

/** 13 to 17: whether a parent or guardian approved sharing (see transcript.ts). */
export async function guardianApproved(volunteerId: string): Promise<boolean> {
  const [r] = (await sql`select guardian_share_ok_at is not null as ok from volunteer where id = ${volunteerId}`) as unknown as { ok: boolean }[];
  return !!r?.ok;
}

/** Strips what a stranger doesn't need from the public JSON. */
export const publicRecord = (r: VolRecord): RecordView => ({
  id: r.id,
  code: r.code,
  status: r.status,
  volunteer_name: r.volunteer_name,
  org: r.org,
  event: r.event,
  role: r.role,
  hours_total: r.hours_total,
  hours_captured: r.hours_captured,
  hours_adjusted: r.hours_adjusted,
  adjusted_by: r.adjusted_by,
  adjustment_reason: r.adjustment_reason,
  attested_at: r.attested_at,
});

// Checked out but not attested yet. Deliberately no hour number: nothing is
// official until the coordinator verifies the event.
export type PendingItem = {
  id: string;
  status: 'checked_out';
  checked_in_at: string | null;
  checked_out_at: string | null;
  event: { id: string; title: string; starts_at: string; location: string | null };
  org: { id: string; name: string };
};

export async function pendingAttendance(volunteerId: string): Promise<PendingItem[]> {
  const rows = (await sql`
    select a.id, a.status, a.checked_in_at, a.checked_out_at, e.id as event_id, e.title, e.starts_at,
           coalesce(e.place_name, e.location) as location, o.id as org_id, o.name as org_name
    from attendance a join event e on e.id = a.event_id join org o on o.id = e.org_id
    where a.volunteer_id = ${volunteerId} and a.status = 'checked_out' and e.attested_at is null and not e.is_practice
    order by e.starts_at desc`) as unknown as {
    id: string; status: 'checked_out'; checked_in_at: Date | null; checked_out_at: Date | null; event_id: string; title: string;
    starts_at: Date; location: string | null; org_id: string; org_name: string;
  }[];
  const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    checked_in_at: iso(r.checked_in_at),
    checked_out_at: iso(r.checked_out_at),
    event: { id: r.event_id, title: r.title, starts_at: iso(r.starts_at)!, location: r.location },
    org: { id: r.org_id, name: r.org_name },
  }));
}

// ---------- share ----------

export async function shareRecord(volunteerId: string, recordId: string): Promise<{ code: string; url: string }> {
  const vol = await getVolunteer(volunteerId);
  if (!vol) throw new VolError('Join first.', 401);
  if (!isUuid(recordId)) throw new VolError('No record with that id.', 404);
  const [rec] = (await sql`
    select r.id, r.code, r.status, r.volunteer_id from record r
    join attendance a on a.id = r.attendance_id join event e on e.id = a.event_id
    where r.id = ${recordId} and not e.is_practice`) as unknown as { id: string; code: string | null; status: string; volunteer_id: string | null }[];
  if (!rec) throw new VolError('No record with that id.', 404);
  if (rec.volunteer_id !== volunteerId) throw new VolError('That record isn’t yours to share.', 403);
  // Checked on the server, so the rule doesn't depend on the button being hidden.
  if (vol.is_minor && !(await guardianApproved(volunteerId))) {
    throw new VolError('Sharing needs a parent or guardian’s OK first. Ask for it on your Transcript page.', 403);
  }
  if (rec.status !== 'active') throw new VolError('This record was revoked by the organization, so it can’t be shared.', 409);

  let code = rec.code;
  for (let i = 0; !code && i < 5; i++) {
    try {
      const [row] = (await sql`
        update record set code = ${shareCode()}, shared_at = now()
        where id = ${rec.id} and code is null
        returning code`) as unknown as { code: string }[];
      // Someone else's tap may have won the race; read what it set.
      code = row?.code ?? ((await sql`select code from record where id = ${rec.id}`) as unknown as { code: string | null }[])[0]?.code ?? null;
    } catch (e) {
      if ((e as { code?: string }).code !== '23505') throw e; // unique clash: draw again
    }
  }
  if (!code) throw new VolError('Couldn’t make a link just now. Try again.', 503);
  return { code, url: `${appUrl()}/v/${code}` };
}

// ---------- leave-the-area check (opt-in) ----------

/** Whether this check-in can offer the leave-the-area toggle (the coordinator set a site) and whether it's on. */
export async function leaveCheck(volunteerId: string, attendanceId: string): Promise<{ available: boolean; opted_in: boolean }> {
  if (!isUuid(attendanceId)) return { available: false, opted_in: false };
  const [r] = (await sql`
    select a.location_opt_in, e.site_lat, e.site_lng from attendance a join event e on e.id = a.event_id
    where a.id = ${attendanceId} and a.volunteer_id = ${volunteerId} and a.status = 'checked_in'`) as unknown as {
    location_opt_in: boolean; site_lat: number | null; site_lng: number | null;
  }[];
  return { available: !!r && r.site_lat != null && r.site_lng != null, opted_in: !!r?.location_opt_in };
}
