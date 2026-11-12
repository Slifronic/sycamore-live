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
import { Icon } from '@/components/shell/icons';
import { letterMeta } from '@/lib/page-meta';
import { computeMilestones, computeSkills, nextMilestones, reachedMilestones, type Attended } from '@/lib/milestones';
import { MilestoneList, SkillList } from '@/components/milestones/Counted';

export async function generateMetadata({ params }: PageProps<'/org/volunteers/[id]/letter'>) {
  return letterMeta((await params).id);
}

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
  const { id } = await params;
  const org = await requireOrg(`/org/volunteers/${id}/letter`);
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
  // Milestones and skills practiced, counted from this organization's verified
  // rows only (the query above is scoped to org.id, and so is the arithmetic).
  // A coordinator never sees hours another organization verified.
  const attended: Attended[] = rows.map((r) => ({
    org_id: org.id, org_name: org.name, starts_at: r.starts_at, role: r.role, activity: r.activity, hours: hoursTotal(r), status: 'attested', is_practice: false,
  }));
  const milestones = computeMilestones(attended, { orgId: org.id });
  const reached = reachedMilestones(milestones);
  const skills = computeSkills(attended, { orgId: org.id });
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 800 }}>
      <h1 className="sr-only">Hour letter</h1>
      <div className="row between wrap no-print">
        <nav aria-label="Breadcrumb" className={s.crumbs}>
          <Link href="/org/volunteers">Volunteers</Link>
          <Icon name="chevron-right" size={14} />
          <span aria-current="page">Hour letter · {vol.name}</span>
        </nav>
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

      <section className={`card card-pad no-print ${s.counted}`} aria-labelledby="counted-title">
        <div>
          <h2 id="counted-title" className={s.countedTitle}>
            Milestones and skills practiced at {org.name}
          </h2>
          <p className="small muted">
            Counted from the events you verified for {vol.name}, and nothing from any other organization. Not signed, not part of the letter, and it changes if you correct an
            hour. Skill areas can overlap, so they don’t add up to a total.
          </p>
        </div>
        <div>
          <h3 className="eyebrow">Milestones</h3>
          <MilestoneList reached={reached} next={nextMilestones(milestones, 2, reached.length === 0)} empty="Every milestone is reached." />
        </div>
        <div>
          <h3 className="eyebrow">Skills practiced</h3>
          <SkillList lines={skills} byOrg={false} empty="No verified events yet." />
        </div>
      </section>
    </div>
  );
}

export const instant = false;
