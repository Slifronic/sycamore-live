import Link from 'next/link';
import { activeSession, pendingAttendance, requireVolunteer, volunteerRecords } from '@/lib/vol-data';
import { volunteerThreads } from '@/lib/messages';
import { sql } from '@/lib/db';
import { volunteerChats } from '@/lib/event-chat';
import { fmtHours } from '@/lib/hours';
import { fmtDay, fmtTime, plural } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { GoalCard } from './GoalCard';
import { CountUp } from '@/components/motion/CountUp';
import { Cover } from '@/components/media/Cover';
import { EmptyState } from '@/components/media/EmptyState';
import { coverFor } from '@/lib/covers';
import { volSignOut } from '../actions';
import s from '../pages.module.css';

// Contract: "My hours". The active session on top, then what's attested
// (totals, the personal goal, one card per record) and what's still waiting
// for the organization, shown with no hour number because nothing is official
// until it's attested. Only this volunteer's rows, never practice events.

const month = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short' }).toUpperCase();
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', day: 'numeric' });

export default async function MyHours() {
  const vol = await requireVolunteer('/me');
  const [active, records, pending, threads, chats] = await Promise.all([
    activeSession(vol.id),
    volunteerRecords(vol.id),
    pendingAttendance(vol.id),
    volunteerThreads(vol.id),
    volunteerChats(vol.id),
  ]);
  const signedBadges = ((await sql`select count(*)::int as n from badge_award where volunteer_id = ${vol.id}`) as unknown as { n: number }[])[0]?.n ?? 0;
  const hours = records.reduce((n, r) => n + r.hours_total, 0);
  const orgs = new Set(records.map((r) => r.org_id)).size;
  const unread = threads.reduce((n, t) => n + t.unread, 0) + chats.reduce((n, c) => n + c.unread, 0);
  const first = vol.name.split(' ')[0];

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="My hours"
        title={records.length ? `Welcome back, ${first}.` : `Welcome, ${first}.`}
        lede="Hours your organizations have confirmed. Always yours to keep."
        action={
          !active && (
            <Link href="/checkin" className="btn btn-primary btn-big">
              Check in to an event
            </Link>
          )
        }
      />

      {active && (
        <Link href="/checkin" className={s.live}>
          <div className="stack" style={{ gap: 6 }}>
            <span className={s.liveTop}>
              <span className={s.pulse} aria-hidden /> Checked in now
            </span>
            <span className={s.liveTitle}>{active.event.title}</span>
            <span className="small" style={{ color: '#b8d4c2' }}>
              {active.org.name} · since {fmtTime(active.checked_in_at)}
            </span>
          </div>
          <span className={s.liveCta}>Open to check out →</span>
        </Link>
      )}

      <section className={s.band} aria-label="Attested so far">
        <div className={s.kpi}>
          <span className={s.kpiLabel}>Attested hours</span>
          <span className={s.kpiNum}>
            <CountUp value={hours} decimals={Number.isInteger(hours) ? 0 : Number.isInteger(hours * 10) ? 1 : 2} duration={1.1} />
          </span>
          <span className={s.kpiSub}>Confirmed by the organization</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>Events</span>
          <span className={s.kpiNum}>
            <CountUp value={records.length} delay={0.1} />
          </span>
          <span className={s.kpiSub}>{pending.length ? `${pending.length} more waiting to be confirmed` : 'With an attested record'}</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>Organizations</span>
          <span className={s.kpiNum}>
            <CountUp value={orgs} delay={0.2} />
          </span>
          <span className={s.kpiSub}>That vouch for your time</span>
        </div>
      </section>

      <div className={s.cols}>
        <div className={s.col}>
          {pending.length > 0 && (
            <>
              <div className={s.sectionHead}>
                <h2>Waiting for confirmation</h2>
                <span className="small muted">No hours shown until it’s attested</span>
              </div>
              {pending.map((p) => (
                <div key={p.id} className={s.pending}>
                  <span className="chip chip-amber" style={{ justifySelf: 'start' }}>
                    Pending
                  </span>
                  <p className={s.recordTitle}>{p.event.title}</p>
                  <p className="small muted">
                    {fmtDay(p.event.starts_at)}
                    {p.checked_out_at ? ` · checked out at ${fmtTime(p.checked_out_at)}` : ''}
                  </p>
                  <p className="small">Waiting for {p.org.name} to confirm.</p>
                </div>
              ))}
            </>
          )}

          <div className={s.sectionHead}>
            <h2>Attested records</h2>
            <span className="small muted">{plural(records.length, 'record')}</span>
          </div>
          {records.length === 0 ? (
            <div className="card">
              <EmptyState
                illo="sapling"
                title="Your record starts at your next event."
                action={
                  <>
                    <Link href="/checkin" className="btn btn-primary">
                      Check in to an event
                    </Link>
                    <Link href="/discover" className="btn">
                      Find an event
                    </Link>
                  </>
                }
              >
                Check in when you arrive and check out when you leave. Once the organization confirms the event, your record shows up here, ready to share.
              </EmptyState>
            </div>
          ) : (
            records.map((r, i) => (
              <Link key={r.id} href={`/me/records/${r.id}`} className={`card fade-in ${s.record}`} style={{ ['--d' as string]: `${Math.min(i, 6) * 0.05}s` }}>
                <span className={s.thumbWrap} aria-hidden>
                  <Cover cover={coverFor({ title: r.event.title })} variant="thumb" className={s.thumb} sizes="64px" />
                  <span className={s.dateTag}>
                    {month(r.starts_at)} <b>{day(r.starts_at)}</b>
                  </span>
                </span>
                <span className={s.recordBody}>
                  <span className={s.recordTitle}>{r.event.title}</span>
                  <span className="small muted">
                    {r.org.name}
                    {r.event.location ? ` · ${r.event.location}` : ''}
                  </span>
                  <span className="row wrap" style={{ gap: 6 }}>
                    <span className={`chip ${r.status === 'active' ? 'chip-green' : 'chip-red'}`}>{r.status === 'active' ? '✓ Attested' : 'Revoked'}</span>
                    <span className="chip chip-ink">{ROLE_LABEL[r.role]}</span>
                    {r.code && r.status === 'active' && <span className="chip chip-ink">Shared</span>}
                  </span>
                </span>
                <span className={s.recordHours}>
                  <span className="figure">
                    {fmtHours(r.hours_total)}
                    <span className="figure-unit">h</span>
                  </span>
                  {r.hours_adjusted != null && <span className="small muted">adjusted</span>}
                </span>
              </Link>
            ))
          )}
        </div>

        <aside className={s.col}>
          <GoalCard goal={vol.hours_goal} attested={hours} />
          {vol.is_minor && (
            <div className="card card-pad stack" style={{ gap: 6 }}>
              <h3>Sharing needs a guardian’s OK</h3>
              <p className="small muted">You can check in and see every record. Because you’re under 18, share links will open once guardian consent is added.</p>
            </div>
          )}
          <Link href="/me/badges" className="card card-pad stack lift" style={{ gap: 6, textDecoration: 'none' }}>
            <span className="row between">
              <h3>Badges and journey</h3>
              {signedBadges > 0 && <span className="chip chip-green">{signedBadges} signed</span>}
            </span>
            <span className="small muted">Recognition your organizations signed, and the events and roles behind it.</span>
          </Link>
          <Link href="/me/messages" className="card card-pad stack lift" style={{ gap: 6, textDecoration: 'none' }}>
            <span className="row between">
              <h3>Messages</h3>
              {unread > 0 && <span className="chip chip-amber">{unread} new</span>}
            </span>
            <span className="small muted">
              {threads.length || chats.length ? 'Notes from your coordinators and your event group chats.' : 'Coordinators can write to you here after your first event.'}
            </span>
          </Link>
          <div className="card card-pad stack" style={{ gap: 6, background: 'var(--primary-soft)', boxShadow: 'none' }}>
            <h3>Who confirms my hours?</h3>
            <p className="small muted">
              The organization does, when it closes the event. SycaMore records your check-in and check-out and never lets anyone type hours in. If a number looks wrong, message the coordinator: any change they make shows with its reason.
            </p>
          </div>
          <form action={volSignOut} className="row between small muted" style={{ padding: '0 4px' }}>
            <span>Signed in as {vol.email}</span>
            <button className="btn btn-quiet btn-sm">Sign out</button>
          </form>
        </aside>
      </div>
    </div>
  );
}

export const instant = false;
