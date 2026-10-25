import 'server-only';
import { sql } from '@/lib/db';

// The volunteer's own account: consent, export and deletion. Everything here
// is scoped to one volunteer id that the caller took from the `vid` cookie.

export const FORMER = 'Former volunteer';

/** "I agree to the Terms and Privacy Policy", ticked at join or at a walk-in. Keeps the first time. */
export async function acceptTerms(volunteerId: string) {
  await sql`update volunteer set terms_accepted_at = coalesce(terms_accepted_at, now()) where id = ${volunteerId}`;
}

/** Announcements opt-in (marketing consent). Off by default; the time is kept when it's turned on. */
export async function setMarketingOptIn(volunteerId: string, on: boolean) {
  const [r] = (await sql`
    update volunteer set marketing_opt_in = ${on}, marketing_opt_in_at = case when ${on} then now() else null end
    where id = ${volunteerId}
    returning marketing_opt_in`) as unknown as { marketing_opt_in: boolean }[];
  return r?.marketing_opt_in ?? null;
}

export async function accountSettings(volunteerId: string) {
  const [r] = (await sql`
    select marketing_opt_in, terms_accepted_at from volunteer where id = ${volunteerId}`) as unknown as { marketing_opt_in: boolean; terms_accepted_at: Date | null }[];
  return r ?? null;
}

/** Every row that is about this volunteer, as plain JSON. */
export async function exportData(volunteerId: string) {
  const [volunteer] = await sql`
    select id, name, email, to_char(date_of_birth, 'YYYY-MM-DD') as date_of_birth, created_at, signup_method,
           (google_sub is not null) as signed_up_with_google, hours_goal, terms_accepted_at, marketing_opt_in, marketing_opt_in_at
    from volunteer where id = ${volunteerId}`;
  if (!volunteer) return null;
  const [attendance, records, badges, messages, chatPosts, saved] = await Promise.all([
    sql`
      select a.id, e.title as event, o.name as organization, e.starts_at as event_starts_at, a.method, a.checked_in_at, a.checked_out_at,
             a.hours_captured, a.hours_adjusted, a.adjustment_reason, a.role, a.status, a.attested_at, a.location_opt_in, a.left_area_at
      from attendance a join event e on e.id = a.event_id join org o on o.id = e.org_id
      where a.volunteer_id = ${volunteerId} order by e.starts_at`,
    sql`
      select r.id, r.attendance_id, o.name as organization, r.code as share_code, r.issued_at, r.shared_at, r.status
      from record r join org o on o.id = r.org_id where r.volunteer_id = ${volunteerId} order by r.issued_at`,
    sql`
      select b.id, o.name as organization, b.badge, b.evidence_note, b.signed_by, b.signed_at, b.code as share_code, b.shared_at
      from badge_award b join org o on o.id = b.org_id where b.volunteer_id = ${volunteerId} order by b.signed_at`,
    sql`
      select m.id, o.name as organization, m.direction, m.body, m.source, m.sent_by, m.created_at, m.read_at
      from message m join org o on o.id = m.org_id where m.volunteer_id = ${volunteerId} order by m.created_at`,
    sql`
      select c.id, e.title as event, c.body, c.created_at
      from event_chat c join event e on e.id = c.event_id where c.volunteer_id = ${volunteerId} order by c.created_at`,
    sql`
      select e.title as event, s.saved_at from saved_event s join event e on e.id = s.event_id where s.volunteer_id = ${volunteerId} order by s.saved_at`,
  ]);
  return {
    exported_at: new Date().toISOString(),
    about:
      'Everything SycaMore Live keeps about you. Messages are the ones between you and an organization; event chat posts are the ones you wrote. Hours come from check-in and check-out times and the organization’s confirmation.',
    volunteer,
    attendance,
    records,
    badges,
    messages,
    event_chat_posts: chatPosts,
    saved_events: saved,
  };
}

/**
 * Delete the account. The volunteer row, their messages, chat posts, badges
 * and saved events go. Attendance and records stay, unlinked and renamed
 * "Former volunteer", so the organization's attested totals still add up. The
 * attendance lock (lock_attested) allows exactly that change on attested rows.
 * Share links stop working: their codes are cleared.
 */
export async function deleteAccount(volunteerId: string) {
  return sql.begin(async (tx) => {
    const [v] = (await tx`select id from volunteer where id = ${volunteerId} for update`) as unknown as { id: string }[];
    if (!v) return false;
    await tx`update record set volunteer_id = null, code = null, shared_at = null where volunteer_id = ${volunteerId}`;
    await tx`update attendance set volunteer_id = null, display_name = ${FORMER} where volunteer_id = ${volunteerId}`;
    await tx`delete from message where volunteer_id = ${volunteerId}`;
    await tx`delete from event_chat where volunteer_id = ${volunteerId}`;
    await tx`delete from event_chat_read where reader = ${volunteerId}`;
    await tx`delete from badge_award where volunteer_id = ${volunteerId}`;
    await tx`delete from saved_event where volunteer_id = ${volunteerId}`;
    await tx`delete from volunteer where id = ${volunteerId}`;
    return true;
  });
}
