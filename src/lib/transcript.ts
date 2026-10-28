import 'server-only';
import { sql } from './db';
import { randomToken, sha256 } from './auth-tokens';
import { transcriptCode, TRANSCRIPT_CODE } from './codes';
import { MailError, sendEmail } from './mailer';
import { limit } from './rate-limit';
import { appUrl, getVolunteer, VolError, volunteerRecords } from './vol-data';
import { ROLE_LABEL, type Role } from './types';

// The service transcript: everything a volunteer has done, across every
// organization, on one page a school or scholarship committee can check.
//
// Two kinds of evidence, never blended into one claim:
//   scanned   an organization on SycaMore attested it from check-in/out scans
//   email     a supervisor somewhere else confirmed it from an emailed link
// Totals show both and say which is which. Nothing the volunteer types is
// ever counted until someone else confirms it.

export type Evidence = 'scanned' | 'email';

export type TranscriptLine = {
  date: string; // YYYY-MM-DD, Pacific
  org: string;
  activity: string;
  role: string;
  hours: number;
  evidence: Evidence;
  attested_by: string; // who said so
  attested_on: string; // ISO
  record_code: string | null; // a shared single record, if any
};

export type OrgSummary = {
  org: string;
  hours: number;
  days: number;
  first: string;
  last: string;
  weeks: number; // distinct weeks with service, all time
  hours_per_week: number; // average over the weeks served (Common App's "hours per week")
  weeks_last_year: number; // distinct weeks in the last 12 months ("weeks per year")
};

export type Transcript = {
  name: string;
  lines: TranscriptLine[];
  orgs: OrgSummary[];
  hours: { total: number; scanned: number; email: number };
  months_active: number;
  first: string | null;
  last: string | null;
  milestone: Milestone | null;
  next_milestone: Milestone | null;
};

// SycaMore's own milestones. Deliberately not named after, or styled like, the
// President's Volunteer Service Award, which AmeriCorps paused in May 2025.
export type Milestone = { hours: number; name: string };
export const MILESTONES: Milestone[] = [
  { hours: 25, name: 'Seedling' },
  { hours: 50, name: 'Sapling' },
  { hours: 100, name: 'Understory' },
  { hours: 250, name: 'Canopy' },
  { hours: 500, name: 'Old growth' },
];

const round = (n: number) => Math.round(n * 100) / 100;

/** ISO week key (YYYY-Www) for a YYYY-MM-DD date. */
function weekKey(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week decides the year
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

type EmailRow = {
  served_on: string; org_name: string; description: string; confirmed_hours: number; confirmer_name: string; confirmer_role: string | null; decided_at: Date;
};

export async function buildTranscript(volunteerId: string, name: string): Promise<Transcript> {
  const [records, emailed] = await Promise.all([
    volunteerRecords(volunteerId),
    sql`
      select to_char(served_on, 'YYYY-MM-DD') as served_on, org_name, description, confirmed_hours, confirmer_name, confirmer_role, decided_at
      from hour_request where volunteer_id = ${volunteerId} and status = 'confirmed'` as unknown as Promise<EmailRow[]>,
  ]);

  const lines: TranscriptLine[] = [
    ...records
      .filter((r) => r.status === 'active')
      .map((r) => ({
        date: r.event.date,
        org: r.org.name,
        activity: r.event.title,
        role: ROLE_LABEL[r.role as Role],
        hours: r.hours_total,
        evidence: 'scanned' as const,
        attested_by: r.org.name,
        attested_on: r.attested_at,
        record_code: r.code,
      })),
    ...emailed.map((h) => ({
      date: h.served_on,
      org: h.org_name,
      activity: h.description,
      role: 'Volunteer',
      hours: Number(h.confirmed_hours),
      evidence: 'email' as const,
      attested_by: h.confirmer_role ? `${h.confirmer_name}, ${h.confirmer_role}` : h.confirmer_name,
      attested_on: new Date(h.decided_at).toISOString(),
      record_code: null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const byOrg = new Map<string, TranscriptLine[]>();
  for (const l of lines) byOrg.set(l.org, [...(byOrg.get(l.org) ?? []), l]);
  const orgs: OrgSummary[] = [...byOrg.entries()]
    .map(([org, ls]) => {
      const hours = round(ls.reduce((n, l) => n + l.hours, 0));
      const weeks = new Set(ls.map((l) => weekKey(l.date))).size;
      const dates = ls.map((l) => l.date).sort();
      return {
        org,
        hours,
        days: new Set(dates).size,
        first: dates[0]!,
        last: dates[dates.length - 1]!,
        weeks,
        hours_per_week: round(hours / Math.max(1, weeks)),
        weeks_last_year: new Set(ls.filter((l) => l.date >= yearAgo).map((l) => weekKey(l.date))).size,
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const scanned = round(lines.filter((l) => l.evidence === 'scanned').reduce((n, l) => n + l.hours, 0));
  const email = round(lines.filter((l) => l.evidence === 'email').reduce((n, l) => n + l.hours, 0));
  const total = round(scanned + email);
  const reached = MILESTONES.filter((m) => total >= m.hours);
  const dates = lines.map((l) => l.date).sort();
  return {
    name,
    lines,
    orgs,
    hours: { total, scanned, email },
    months_active: new Set(lines.map((l) => l.date.slice(0, 7))).size,
    first: dates[0] ?? null,
    last: dates[dates.length - 1] ?? null,
    milestone: reached[reached.length - 1] ?? null,
    next_milestone: MILESTONES.find((m) => total < m.hours) ?? null,
  };
}

// ---------- sharing ----------

export type ShareState = { allowed: boolean; is_minor: boolean; guardian_email: string | null; guardian_pending: boolean };

/** Adults can share. 13 to 17 can once a parent or guardian approves from the emailed link. */
export async function shareState(volunteerId: string): Promise<ShareState> {
  const v = await getVolunteer(volunteerId);
  if (!v) throw new VolError('Join first.', 401);
  const [g] = (await sql`
    select guardian_email, guardian_share_ok_at is not null as ok,
      exists (select 1 from guardian_request r where r.volunteer_id = volunteer.id and r.decided_at is null and r.expires_at > now()) as pending
    from volunteer where id = ${volunteerId}`) as unknown as { guardian_email: string | null; ok: boolean; pending: boolean }[];
  return { allowed: !v.is_minor || !!g?.ok, is_minor: v.is_minor, guardian_email: g?.guardian_email ?? null, guardian_pending: !!g?.pending };
}

export async function publishTranscript(volunteerId: string): Promise<string> {
  const st = await shareState(volunteerId);
  if (!st.allowed) throw new VolError('A parent or guardian needs to approve sharing first.', 403);
  for (let i = 0; i < 5; i++) {
    try {
      const [r] = (await sql`
        update volunteer set transcript_code = coalesce(transcript_code, ${transcriptCode()}), transcript_shared_at = coalesce(transcript_shared_at, now())
        where id = ${volunteerId} returning transcript_code`) as unknown as { transcript_code: string }[];
      return r!.transcript_code;
    } catch (e) {
      if ((e as { code?: string }).code !== '23505') throw e;
    }
  }
  throw new Error('Could not draw a transcript code.');
}

/** Turns the public link off. Publishing again makes a new link, so old copies stop working. */
export async function unpublishTranscript(volunteerId: string) {
  await sql`update volunteer set transcript_code = null, transcript_shared_at = null where id = ${volunteerId}`;
}

export async function transcriptByCode(raw: string): Promise<(Transcript & { code: string; shared_at: string }) | null> {
  const code = String(raw ?? '').toUpperCase();
  if (!TRANSCRIPT_CODE.test(code)) return null;
  const [v] = (await sql`
    select id, name, transcript_shared_at, date_of_birth > (current_date - interval '18 years') as minor, guardian_share_ok_at
    from volunteer where transcript_code = ${code}`) as unknown as { id: string; name: string; transcript_shared_at: Date; minor: boolean; guardian_share_ok_at: Date | null }[];
  // A guardian's approval can be withdrawn; the link stops working with it.
  if (!v || (v.minor && !v.guardian_share_ok_at)) return null;
  return { ...(await buildTranscript(v.id, v.name)), code, shared_at: new Date(v.transcript_shared_at).toISOString() };
}

// ---------- guardian approval (13 to 17) ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function requestGuardianApproval(volunteerId: string, rawEmail: string) {
  const v = await getVolunteer(volunteerId);
  if (!v) throw new VolError('Join first.', 401);
  if (!v.is_minor) throw new VolError('Only volunteers under 18 need a guardian’s approval.', 400);
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) throw new VolError('That email doesn’t look right.', 400);
  if (email === v.email.toLowerCase()) throw new VolError('Use a parent or guardian’s email, not your own.', 400);
  await limit(`guardian:${volunteerId}`, 3, 86_400);
  const token = randomToken();
  await sql`update guardian_request set expires_at = now() where volunteer_id = ${volunteerId} and decided_at is null`;
  await sql`
    insert into guardian_request (token_hash, volunteer_id, guardian_email, expires_at)
    values (${sha256(token)}, ${volunteerId}, ${email}, now() + interval '14 days')`;
  await sql`update volunteer set guardian_email = ${email} where id = ${volunteerId}`;
  try {
    await sendEmail({
      to: email,
      subject: `${v.name} asked you to approve sharing their volunteer hours`,
      text: [
        `${v.name} volunteers with organizations that record hours on SycaMore. Because they’re under 18, they need a parent or guardian’s OK before they can share a link to those hours (with a school, a scholarship or a club).`,
        '',
        `Review and decide here (the link works for 14 days):`,
        `${appUrl()}/guardian/${token}`,
        '',
        'Sharing shows their name, the organizations, dates, roles and hours. It never shows their email, birth date or messages. You can turn it off later from the same page.',
        '',
        'If you don’t know this person, ignore this email and nothing changes.',
      ].join('\n'),
    });
  } catch (e) {
    await sql`delete from guardian_request where token_hash = ${sha256(token)}`;
    if (e instanceof MailError) throw new VolError('We couldn’t send the email just now. Try again in a few minutes.', 503);
    throw e;
  }
}

type GuardianRow = { volunteer_id: string; name: string; guardian_email: string; decided_at: Date | null; approved: boolean | null; expired: boolean };

export async function guardianRequest(token: string): Promise<GuardianRow | null> {
  if (!token || token.length > 64) return null;
  const [r] = (await sql`
    select g.volunteer_id, v.name, g.guardian_email, g.decided_at, g.approved, g.expires_at < now() as expired
    from guardian_request g join volunteer v on v.id = g.volunteer_id
    where g.token_hash = ${sha256(token)}`) as unknown as GuardianRow[];
  return r ?? null;
}

export async function decideGuardian(token: string, approve: boolean) {
  const r = await guardianRequest(token);
  if (!r || (r.expired && !r.decided_at)) throw new VolError('This link has expired. Ask them to send a new one.', 410);
  await sql`update guardian_request set decided_at = now(), approved = ${approve} where token_hash = ${sha256(token)}`;
  await sql`update volunteer set guardian_share_ok_at = ${approve ? sql`now()` : null} where id = ${r.volunteer_id}`;
  // Withdrawing approval takes everything public down.
  if (!approve) {
    await sql`update volunteer set transcript_code = null, transcript_shared_at = null where id = ${r.volunteer_id}`;
    await sql`update record set code = null, shared_at = null where volunteer_id = ${r.volunteer_id}`;
  }
}

// ---------- hours from organizations not on SycaMore ----------

export type HourRequestInput = { org_name: string; contact_name: string; contact_email: string; served_on: string; hours: number; description: string };

export type HourRequestView = {
  id: string; org_name: string; contact_name: string; contact_email: string; served_on: string; hours: number; description: string;
  status: 'pending' | 'confirmed' | 'declined'; confirmed_hours: number | null; confirmer_name: string | null; decline_reason: string | null;
  can_resend: boolean; expired: boolean;
};

const FREE_MAIL = /@(gmail|googlemail|yahoo|outlook|hotmail|icloud|me|aol|live|proton|protonmail)\./i;

export async function createHourRequest(volunteerId: string, raw: Partial<Record<keyof HourRequestInput, unknown>>) {
  const v = await getVolunteer(volunteerId);
  if (!v) throw new VolError('Join first.', 401);
  const org_name = String(raw.org_name ?? '').trim().replace(/\s+/g, ' ');
  const contact_name = String(raw.contact_name ?? '').trim().replace(/\s+/g, ' ');
  const contact_email = String(raw.contact_email ?? '').trim().toLowerCase();
  const served_on = String(raw.served_on ?? '');
  const hours = Number(raw.hours);
  const description = String(raw.description ?? '').trim().replace(/\s+/g, ' ');
  if (org_name.length < 2 || org_name.length > 120) throw new VolError('Add the organization’s name.', 400);
  if (contact_name.length < 2 || contact_name.length > 80) throw new VolError('Add your supervisor’s name.', 400);
  if (!EMAIL.test(contact_email) || contact_email.length > 200) throw new VolError('Your supervisor’s email doesn’t look right.', 400);
  // No self-attestation.
  if (contact_email === v.email.toLowerCase()) throw new VolError('Your supervisor has to confirm this, not you. Use their email.', 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(served_on)) throw new VolError('Pick the date you served.', 400);
  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 366 * 86_400_000).toISOString().slice(0, 10);
  if (served_on > today) throw new VolError('That date is in the future.', 400);
  if (served_on < yearAgo) throw new VolError('Ask about service from the last 12 months; older hours need a letter from the organization.', 400);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 12 || Math.round(hours * 4) !== hours * 4) {
    throw new VolError('Hours go in quarter hours, up to 12 for one day.', 400);
  }
  if (description.length < 10 || description.length > 500) throw new VolError('Say what you did in a sentence or two.', 400);
  await limit(`hour-request:${volunteerId}`, 10, 86_400);

  const token = randomToken();
  const [row] = (await sql`
    insert into hour_request (volunteer_id, org_name, contact_name, contact_email, served_on, hours, description, token_hash, expires_at)
    values (${volunteerId}, ${org_name}, ${contact_name}, ${contact_email}, ${served_on}, ${hours}, ${description}, ${sha256(token)}, now() + interval '30 days')
    returning id`) as unknown as { id: string }[];
  try {
    await mailSupervisor({ token, volunteer: v.name, org_name, contact_name, contact_email, served_on, hours, description });
  } catch (e) {
    // Nothing waits on an email that never left: take the request back out.
    await sql`delete from hour_request where id = ${row!.id}`;
    if (e instanceof MailError) throw new VolError('We couldn’t send the email just now. Try again in a few minutes.', 503);
    throw e;
  }
  return row!.id;
}

async function mailSupervisor(r: { token: string; volunteer: string; org_name: string; contact_name: string; contact_email: string; served_on: string; hours: number; description: string }) {
  const day = new Date(`${r.served_on}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  await sendEmail({
    to: r.contact_email,
    subject: `Can you confirm ${r.volunteer}’s ${r.hours} volunteer hours?`,
    text: [
      `Hi ${r.contact_name.split(' ')[0]},`,
      '',
      `${r.volunteer} says they volunteered with ${r.org_name} on ${day} for ${r.hours} hours:`,
      `“${r.description}”`,
      '',
      'Confirm, correct or decline it here. It takes about 30 seconds and you don’t need an account:',
      `${appUrl()}/confirm/${r.token}`,
      '',
      'Your name and role appear next to the hours on their record, so only confirm what you saw.',
      FREE_MAIL.test(r.contact_email) ? '' : `Running volunteers at ${r.org_name}? SycaMore records hours from a QR scan and gives every volunteer a record schools can check. It’s free to start: ${appUrl()}/org/start`,
    ].join('\n'),
  });
}

export async function hourRequests(volunteerId: string): Promise<HourRequestView[]> {
  return (await sql`
    select id, org_name, contact_name, contact_email, to_char(served_on, 'YYYY-MM-DD') as served_on, hours, description, status,
           confirmed_hours, confirmer_name, decline_reason,
           (status = 'pending' and sent_count < 3 and last_sent_at < now() - interval '2 days' and expires_at > now()) as can_resend,
           (status = 'pending' and expires_at < now()) as expired
    from hour_request where volunteer_id = ${volunteerId} order by created_at desc limit 50`) as unknown as HourRequestView[];
}

/** A reminder to the supervisor: at most twice, two days apart. Issues a fresh link (the old one stops working). */
export async function resendHourRequest(volunteerId: string, id: string) {
  const v = await getVolunteer(volunteerId);
  if (!v) throw new VolError('Join first.', 401);
  const token = randomToken();
  const [r] = (await sql`
    update hour_request set token_hash = ${sha256(token)}, sent_count = sent_count + 1, last_sent_at = now(), expires_at = now() + interval '30 days'
    where id = ${id} and volunteer_id = ${volunteerId} and status = 'pending' and sent_count < 3 and last_sent_at < now() - interval '2 days'
    returning org_name, contact_name, contact_email, to_char(served_on, 'YYYY-MM-DD') as served_on, hours, description`) as unknown as
    { org_name: string; contact_name: string; contact_email: string; served_on: string; hours: number; description: string }[];
  if (!r) throw new VolError('You can send a reminder twice, two days apart.', 409);
  await mailSupervisor({ token, volunteer: v.name, ...r, hours: Number(r.hours) });
}

export type ConfirmView = {
  volunteer: string; org_name: string; contact_name: string; served_on: string; hours: number; description: string;
  status: 'pending' | 'confirmed' | 'declined'; expired: boolean;
};

export async function hourRequestByToken(token: string): Promise<ConfirmView | null> {
  if (!token || token.length > 64) return null;
  const [r] = (await sql`
    select v.name as volunteer, h.org_name, h.contact_name, to_char(h.served_on, 'YYYY-MM-DD') as served_on, h.hours, h.description, h.status,
           h.expires_at < now() as expired
    from hour_request h join volunteer v on v.id = h.volunteer_id where h.token_hash = ${sha256(token)}`) as unknown as ConfirmView[];
  return r ? { ...r, hours: Number(r.hours) } : null;
}

export async function decideHourRequest(
  token: string,
  d: { confirm: boolean; name: string; role: string; hours?: number; reason?: string; not_related: boolean },
) {
  const r = await hourRequestByToken(token);
  if (!r) throw new VolError('This link isn’t valid any more.', 404);
  if (r.status !== 'pending') throw new VolError('This has already been answered. Thank you.', 409);
  if (r.expired) throw new VolError('This link has expired. They can send you a new one.', 410);
  const name = d.name.trim().replace(/\s+/g, ' ').slice(0, 80);
  const role = d.role.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (name.length < 2) throw new VolError('Add your name: it appears next to the hours.', 400);
  if (d.confirm) {
    if (!d.not_related) throw new VolError('Tick the box to confirm you supervised this and aren’t related to them.', 400);
    if (role.length < 2) throw new VolError('Add your role at the organization.', 400);
    const hours = d.hours ?? r.hours;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 12) throw new VolError('Hours go between 0.25 and 12.', 400);
    await sql`
      update hour_request set status = 'confirmed', decided_at = now(), confirmer_name = ${name}, confirmer_role = ${role}, confirmed_hours = ${hours}
      where token_hash = ${sha256(token)} and status = 'pending'`;
  } else {
    await sql`
      update hour_request set status = 'declined', decided_at = now(), confirmer_name = ${name}, confirmer_role = ${role || null},
        decline_reason = ${(d.reason ?? '').trim().slice(0, 300) || null}
      where token_hash = ${sha256(token)} and status = 'pending'`;
  }
}
