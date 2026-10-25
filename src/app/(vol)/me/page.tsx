import Link from 'next/link';
import { activeSession, pendingAttendance, requireVolunteer, volunteerRecords, type VolRecord } from '@/lib/vol-data';
import { sql } from '@/lib/db';
import { fmtHours } from '@/lib/hours';
import { fmtTime, plural, requestNow } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/types';
import { CountUp } from '@/components/motion/CountUp';
import { Stagger } from '@/components/motion/Stagger';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/shell/icons';
import { OrgFolders, type Folder } from '@/components/vol/OrgFolders';
import { orgColor, orgInitials } from '@/components/vol/org-color';
import { ActiveCard } from './ActiveCard';
import { GoalCard } from './GoalCard';
import s from './home.module.css';

export const metadata = { title: 'Home' };

// The volunteer's home. One big number (hours the organizations have
// verified), then what's live (checked in now, waiting to be confirmed, the
// next saved event), then each organization as a folder of its records.
// Pending check-ins never show an hour number: nothing is official until the
// organization attests it. Practice events never appear.

const TZ = 'America/Los_Angeles';
const part = (iso: string | Date, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, ...o });
const ym = (iso: string | number) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' });
const decimals = (n: number) => (Number.isInteger(n) ? 0 : Number.isInteger(n * 10) ? 1 : 2);

function folders(records: VolRecord[]): Folder[] {
  const by = new Map<string, VolRecord[]>();
  for (const r of records) by.set(r.org_id, [...(by.get(r.org_id) ?? []), r]);
  return [...by.entries()]
    .map(([orgId, rs]) => {
      const hours = rs.filter((r) => r.status === 'active').reduce((n, r) => n + r.hours_total, 0);
      const first = rs.at(-1)!; // records come newest first
      const folder: Folder = {
        orgId,
        name: rs[0]!.org.name,
        initials: orgInitials(rs[0]!.org.name),
        color: orgColor(orgId),
        hours: fmtHours(hours),
        hoursLabel: `${fmtHours(hours)} verified ${hours === 1 ? 'hour' : 'hours'}`,
        count: rs.length,
        since: `since ${part(first.starts_at, { month: 'short', year: 'numeric' })}`,
        records: rs.map((r) => ({
          id: r.id,
          title: r.event.title,
          month: part(r.starts_at, { month: 'short' }).toUpperCase(),
          day: part(r.starts_at, { day: 'numeric' }),
          when: part(r.starts_at, { month: 'short', day: 'numeric', year: 'numeric' }),
          role: ROLE_LABEL[r.role],
          hours: fmtHours(r.hours_total),
          revoked: r.status !== 'active',
          shared: !!r.code,
          adjusted: r.hours_adjusted != null,
        })),
      };
      return { folder, hours };
    })
    .sort((a, b) => b.hours - a.hours)
    .map((x) => x.folder);
}

type UpNext = { title: string; slug: string; starts_at: Date; ends_at: Date; place: string | null; org_name: string };

export default async function Home() {
  const vol = await requireVolunteer('/me');
  const [active, records, pending, upNextRows] = await Promise.all([
    activeSession(vol.id),
    volunteerRecords(vol.id),
    pendingAttendance(vol.id),
    sql`
      select e.title, e.public_slug as slug, e.starts_at, e.ends_at, coalesce(e.place_name, e.location) as place, o.name as org_name
      from saved_event s join event e on e.id = s.event_id join org o on o.id = e.org_id
      where s.volunteer_id = ${vol.id} and e.ends_at > now() and e.attested_at is null and not e.is_practice
      order by e.starts_at limit 1` as unknown as Promise<UpNext[]>,
  ]);
  const upNext = upNextRows[0];

  const live = records.filter((r) => r.status === 'active');
  const hours = live.reduce((n, r) => n + r.hours_total, 0);
  const thisMonth = ym(requestNow());
  const monthHours = live.filter((r) => ym(r.starts_at) === thisMonth).reduce((n, r) => n + r.hours_total, 0);
  const orgCount = new Set(records.map((r) => r.org_id)).size;
  const pendingOrgs = [...new Set(pending.map((p) => p.org.name))];

  return (
    <Stagger className={s.page}>
      <section className={s.hero} aria-labelledby="hero-label">
        <p id="hero-label" className={s.heroLabel}>
          Verified hours
        </p>
        <p className={s.heroNum}>
          <CountUp value={hours} decimals={decimals(hours)} duration={1.1} />
        </p>
        <p className={s.heroSub}>
          {monthHours > 0 && <span className={s.delta}>+{fmtHours(monthHours)} this month</span>}
          <span>{records.length ? `${plural(records.length, 'record')} · ${plural(orgCount, 'organization')}` : 'Confirmed by the organizations you serve'}</span>
        </p>
        <GoalCard goal={vol.hours_goal} attested={hours} />
      </section>

      {(active || pending.length > 0 || upNext) && (
        <div className={s.now}>
          {active && <ActiveCard id={active.id} title={active.event.title} org={active.org.name} since={active.checked_in_at} sinceLabel={fmtTime(active.checked_in_at)} />}
          {pendingOrgs.map((org) => (
            <div key={org} className={s.pending}>
              <span className={s.pendingIcon} aria-hidden>
                <Icon name="hourglass" size={20} />
              </span>
              <span className={s.pendingText}>
                <b>Waiting for {org} to confirm</b>
                <span>
                  {pending
                    .filter((p) => p.org.name === org)
                    .map((p) => p.event.title)
                    .join(', ')}
                </span>
              </span>
            </div>
          ))}
          {upNext && (
            <Link href={`/discover/${upNext.slug}`} className={`${s.next} hover-lift`}>
              <span className={s.nextDate} aria-hidden>
                <span>{part(upNext.starts_at, { month: 'short' }).toUpperCase()}</span>
                <b>{part(upNext.starts_at, { day: 'numeric' })}</b>
              </span>
              <span className={s.nextBody}>
                <span className={s.nextEyebrow}>Up next</span>
                <span className={s.nextTitle}>{upNext.title}</span>
                <span className={s.nextMeta}>
                  {part(upNext.starts_at, { weekday: 'short' })} {fmtTime(upNext.starts_at)} · {upNext.org_name}
                </span>
              </span>
              <Icon name="chevron-right" size={20} className={s.nextChev} />
            </Link>
          )}
        </div>
      )}

      <section className={s.orgs} aria-labelledby="orgs-title">
        <div className={s.sectionHead}>
          <h2 id="orgs-title" className={s.h2}>
            Your organizations
          </h2>
          {records.length > 0 && (
            <Link href="/me/journey" className={s.headLink}>
              Journey <Icon name="arrow-right" size={16} />
            </Link>
          )}
        </div>
        {records.length ? (
          <OrgFolders folders={folders(records)} />
        ) : (
          <div className="card">
            <EmptyState
              icon="leaf"
              title="Your first record starts at your next event"
              hint="Check in when you arrive. Once the organization confirms your hours, the record lands here."
              action={
                <span className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
                  {!active && (
                    <Link href="/checkin" className="btn btn-primary">
                      Check in
                    </Link>
                  )}
                  <Link href="/discover" className={active ? 'btn btn-primary' : 'btn'}>
                    Find an event
                  </Link>
                </span>
              }
            />
          </div>
        )}
      </section>
    </Stagger>
  );
}

export const instant = false;
