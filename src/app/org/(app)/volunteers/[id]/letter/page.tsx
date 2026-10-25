import Link from 'next/link';
import { initials } from '@/lib/format';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { hoursTotal } from '@/lib/hours';
import { badgeByKey, type BadgeKey } from '@/lib/badges';
import { ACTIVITY_LABEL, ROLE_LABEL, type Activity, type Role } from '@/lib/types';
import { fmtDay } from '@/lib/format';
import { PrintButton } from '../../../reports/PrintButton';
import s from './letter.module.css';

export const metadata = { title: 'Hour letter' };

type Row = {
  title: string;
  starts_at: Date;
  activity: Activity;
  role: Role;
  hours_captured: number;
  hours_adjusted: number | null;
  adjustment_reason: string | null;
  attested_at: Date;
};

// The hour letter schools ask for: organization letterhead and contact,
// coordinator name and contact, each event with date, role and hours, and when
// it was verified. Built only from verified attendance, so nobody types an hour.
export default async function HourLetter({ params }: PageProps<'/org/volunteers/[id]/letter'>) {
  const org = await requireOrg();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [vol] = (await sql`select id, name from volunteer where id = ${id}`) as unknown as { id: string; name: string }[];
  if (!vol) notFound();
  const rows = (await sql`
    select e.title, e.starts_at, e.activity, a.role, a.hours_captured, a.hours_adjusted, a.adjustment_reason, a.attested_at
    from attendance a join event e on e.id = a.event_id
    where a.volunteer_id = ${id} and e.org_id = ${org.id} and a.status = 'attested' and not e.is_practice
    order by e.starts_at`) as unknown as Row[];
  if (rows.length === 0) notFound();
  const badges = (await sql`select badge, evidence_note, signed_at from badge_award where org_id = ${org.id} and volunteer_id = ${id} order by signed_at`) as unknown as {
    badge: BadgeKey;
    evidence_note: string | null;
    signed_at: Date;
  }[];
  const total = rows.reduce((n, r) => n + hoursTotal(r), 0);
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 800 }}>
      <h1 className="sr-only">Hour letter</h1>
      <div className="row between wrap no-print">
        <p className="small muted">
          <Link href="/org/volunteers">Volunteers</Link> / Hour letter
        </p>
        <PrintButton label="Print or save letter" />
      </div>
      <article className={`paper-sheet ${s.letter}`}>
        <header className={s.head}>
          <div className={s.lhead}>
            <span className={s.mono} aria-hidden>
              {initials(org.name)}
            </span>
            <div>
            <p className={s.org}>{org.name}</p>
            <p className="small muted">
              {org.city ? `${org.city} · ` : ''}
              {org.contact_phone} · {org.contact_email}
            </p>
            </div>
          </div>
          <p className="small muted">{today}</p>
        </header>

        <p>To the service-learning coordinator, scholarship committee, or whom it may concern:</p>
        <p>
          This letter confirms that <strong>{vol.name}</strong> volunteered with {org.name} for <strong>{total.toLocaleString()} verified hours</strong> across{' '}
          {rows.length} {rows.length === 1 ? 'event' : 'events'} between {fmtDay(rows[0].starts_at)} and {fmtDay(rows[rows.length - 1].starts_at)}.
        </p>

        <table className="t">
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Role</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.title}-${String(r.starts_at)}`}>
                <td className="small">{fmtDay(r.starts_at)}</td>
                <td>
                  {r.title}
                  <br />
                  <span className="small muted">{ACTIVITY_LABEL[r.activity]}</span>
                  {r.hours_adjusted != null && <span className="small muted"> · adjusted from {Number(r.hours_captured)}: {r.adjustment_reason}</span>}
                </td>
                <td className="small">{ROLE_LABEL[r.role]}</td>
                <td className="num">{hoursTotal(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {badges.length > 0 && (
          <p className="small">
            <strong>Badges signed:</strong>{' '}
            {badges.map((b) => `${badgeByKey[b.badge].name} (rule: ${badgeByKey[b.badge].rule.charAt(0).toLowerCase()}${badgeByKey[b.badge].rule.slice(1)})`).join('; ')}.
          </p>
        )}

        <p className="small">
          How these hours were recorded: the volunteer checked in and out at each event by scanning a QR code, and I verified each event when it closed
          (verification dates: {[...new Set(rows.map((r) => fmtDay(r.attested_at)))].join(', ')}). Any change to the scanned hours is listed above with its reason.
        </p>

        <footer className={s.sign}>
          <div className={s.line} />
          <p>
            <strong>{org.coordinator_name}</strong>, Volunteer Coordinator, {org.name}
          </p>
          <p className="small muted">
            {org.contact_email} · {org.contact_phone}
          </p>
        </footer>
      </article>
    </div>
  );
}

export const instant = false;
