import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { LESSONS, courseProgress } from '@/lib/course';
import { badgeByKey } from '@/lib/badges';
import { HOUR_RATES, money, rateKeyFor } from '@/lib/value';
import { ago, fmtDay, plural } from './util';
import { IndexCard } from '@/components/IndexCard';
import { CountUp } from '@/components/motion/CountUp';
import { Sparkline } from '@/components/motion/Sparkline';
import { HoursChart } from '@/components/motion/HoursChart';
import s from './home.module.css';
import { requestNow } from '@/lib/format';
import { sql } from '@/lib/db';
import { milestoneThanks } from '@/lib/mailto';

export default async function OrgHome({ searchParams }: PageProps<'/org'>) {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const course = courseProgress(org.course);
  const welcome = (await searchParams).welcome === '1';
  const now = requestNow();
  const live = ins.events.filter((e) => !e.attested_at && new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() >= now);
  const upcoming = ins.events.filter((e) => new Date(e.starts_at).getTime() > now && !e.is_practice).slice(-3).reverse();
  const ids = ins.milestones.map((v) => v.volunteer_id).filter(Boolean) as string[];
  const emails = new Map(
    ((await sql`select id, email from volunteer where id = any(${ids})`) as unknown as { id: string; email: string }[]).map((r) => [r.id, r.email]),
  );
  const hereNow = new Map(
    ((await sql`select event_id, count(*)::int as n from attendance where event_id = any(${live.map((e) => e.id)}) and status = 'checked_in' group by event_id`) as unknown as {
      event_id: string;
      n: number;
    }[]).map((r) => [r.event_id, r.n]),
  );
  const hourRate = HOUR_RATES[rateKeyFor(org.city)];
  const value = ins.totals.verifiedHours * hourRate.usd;
  const hour = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false });
  const greet = Number(hour) < 12 ? 'Good morning' : Number(hour) < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'long', day: 'numeric' });
  const needs = ins.awaiting.length + (ins.badgeReady.length ? 1 : 0) + (ins.slipping.length ? 1 : 0);

  // Running totals per verified event, for the band's sparklines.
  const running = (xs: number[]) => xs.reduce<number[]>((acc, x) => [...acc, (acc.at(-1) ?? 0) + x], []);
  const hoursRun = running(ins.series.map((p) => p.hours));
  const peopleRun = running(ins.series.map((p) => p.people));
  const valueRun = hoursRun.map((x) => x * hourRate.usd);
  const chart = ins.series.slice(-8).map((p) => ({ ...p, date: p.date.toISOString() }));

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <p className="eyebrow">{today}</p>
          <h1>
            {greet}, {org.coordinator_name.split(' ')[0]}
          </h1>
          <p className="muted">{needs === 0 ? 'Nothing needs you right now.' : `${plural(needs, 'thing')} need${needs === 1 ? 's' : ''} you today.`}</p>
        </div>
        <Link className="btn btn-primary btn-big" href="/org/events/new">
          + New event
        </Link>
      </header>

      {welcome && (
        <div className="notice notice-green">
          <strong>You’re set up.</strong> Your sign-in PIN is <strong className="num">{org.coordinator_pin}</strong>. Write it down; that’s the only
          thing to remember. We made a practice event so you can try everything without real volunteers.
        </div>
      )}

      {/* The one saturated band: headline numbers on canopy. */}
      <section className={s.band} aria-label="Totals">
        <Kpi label="Verified hours" value={ins.totals.verifiedHours} decimals={ins.totals.verifiedHours % 1 ? 2 : 0} sub={`${ins.totals.attendances.toLocaleString()} attendances`} spark={hoursRun} />
        <Kpi label="Volunteers" value={ins.totals.uniqueVolunteers} sub={`${ins.totals.standouts} standouts starred`} spark={peopleRun} delay={0.08} />
        <Kpi
          label="Events verified"
          value={ins.totals.verifiedEvents}
          sub={ins.awaiting.length ? `${ins.awaiting.length} waiting for you` : 'all caught up'}
          warn={ins.awaiting.length > 0}
          delay={0.16}
        />
        <Kpi label="Value of volunteer time" value={value} prefix="$" sub={`at ${money(hourRate.usd)}/hr (${hourRate.label})`} spark={valueRun} delay={0.24} />
      </section>

      {!course.complete && course.next && (
        <section className={`card ${s.lesson}`}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--sap)' }}>
              Lesson {LESSONS.indexOf(course.next) + 1} of {course.total} · {course.next.minutes} min
            </p>
            <h2>{course.next.title}</h2>
            <p className="muted">{course.next.why}</p>
          </div>
          <div className={s.lessonSide}>
            <div className={s.fat} aria-label={`${course.done} of ${course.total} lessons done`}>
              <span style={{ width: `${Math.max(12, (100 * course.done) / course.total)}%` }}>
                {course.done}/{course.total}
              </span>
            </div>
            <div className="row wrap">
              <Link className="btn btn-primary" href={course.next.href}>
                Try it now
              </Link>
              <Link className="btn btn-quiet" href="/org/learn">
                All lessons
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className={s.split}>
        <section className="stack">
          <h2>Needs you</h2>
          {ins.awaiting.length === 0 && ins.badgeReady.length === 0 ? (
            <p className="card card-pad muted">All caught up. Verified events and signed badges land here when they need you.</p>
          ) : (
            <div className={s.needs}>
              {ins.awaiting.map((e) => (
                <Link key={e.id} href={`/org/events/${e.id}/verify`} className={`card ${s.need} ${s.waiting}`}>
                  <span className="chip chip-amber">Needs verification</span>
                  <h3>{e.title}</h3>
                  <p className="muted small">Ended {ago(e.ends_at)} · about 2 minutes</p>
                  <span className="btn btn-primary btn-sm">Verify now →</span>
                </Link>
              ))}
              {ins.badgeReady.length > 0 && (
                <Link href="/org/badges" className={`card ${s.need}`}>
                  <span className="chip chip-gold">{plural(ins.badgeReady.length, 'badge')} ready</span>
                  <h3>Ready for your sign-off</h3>
                  <p className="muted small">
                    {ins.badgeReady
                      .slice(0, 3)
                      .map((b) => `${b.v.name} · ${badgeByKey[b.badge].name}`)
                      .join(' · ')}
                  </p>
                  <span className="btn btn-sm">Review badges →</span>
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="stack">
          <h2>Happening now</h2>
          {live.length === 0 ? (
            <div className={s.liveEmpty}>
              <p className="muted small">No event is running right now.</p>
              {upcoming[0] && (
                <Link href={`/org/events/${upcoming[0].id}`} className="small">
                  Next: {upcoming[0].title}, {fmtDay(upcoming[0].starts_at)} →
                </Link>
              )}
            </div>
          ) : (
            live.map((e) => (
              <Link key={e.id} href={`/org/events/${e.id}`} className={s.live}>
                <span className={s.liveTop}>
                  <span className={s.pulse} aria-hidden /> Live{e.is_practice ? ' · practice' : ''}
                </span>
                <strong className={s.liveTitle}>{e.title}</strong>
                <span className={s.liveRow}>
                  <span>
                    <span className={s.liveNum}>{hereNow.get(e.id) ?? 0}</span> here now
                  </span>
                  <span className={s.code}>{e.checkin_code}</span>
                </span>
                <span className={s.liveCta}>Open check-in →</span>
              </Link>
            ))
          )}
        </section>
      </div>

      <div className={s.two}>
        <IndexCard index={ins.index} />
        <section className={`card ${s.chartCard}`}>
          <div className="row between">
            <div>
              <p className="eyebrow">Hours per event</p>
              <h2>Verified hours</h2>
            </div>
            <Link className="btn btn-sm btn-quiet" href="/org/reports">
              Funder report →
            </Link>
          </div>
          <HoursChart points={chart} />
          {chart.length > 0 && (
            <p className={s.chartFoot}>
              {chart.reduce((n, p) => n + p.hours, 0).toLocaleString()} hours across the last {chart.length} verified{' '}
              {chart.length === 1 ? 'event' : 'events'}. Hover a bar for details.
            </p>
          )}
        </section>
      </div>

      <div className={s.two}>
        <section className="card">
          <div className="card-head">
            <h2>Slipping away</h2>
            <span className="chip chip-amber">{ins.slipping.length}</span>
          </div>
          {ins.slipping.length === 0 ? (
            <p className="card-pad muted">Nobody who came twice has been gone more than a month. Nice.</p>
          ) : (
            <ul className={s.list}>
              {ins.slipping.slice(0, 5).map((p) => (
                <li key={p.key}>
                  <span>
                    <strong>{p.name}</strong>
                    <span className="muted small"> · {p.events} events · last came {ago(p.last_seen)}</span>
                  </span>
                  <Link className="btn btn-sm" href={`/org/volunteers?tab=slipping&invite=${encodeURIComponent(p.key)}`}>
                    Invite back
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted card-pad" style={{ paddingTop: 8 }}>
            Came at least twice, gone 30+ days. A personal invite is the best way to keep them.
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Milestones to celebrate</h2>
            <span className="chip chip-gold">{ins.milestones.length}</span>
          </div>
          {ins.milestones.length === 0 ? (
            <p className="card-pad muted">When someone passes 10, 25, 50 or 100 verified hours, they show up here so you can thank them.</p>
          ) : (
            <ul className={s.list}>
              {ins.milestones.slice(0, 5).map((p) => {
                const email = p.volunteer_id ? emails.get(p.volunteer_id) : undefined;
                return (
                  <li key={p.key}>
                    <span className="row" style={{ gap: 10 }}>
                      <span className={s.medal} aria-hidden>
                        {p.milestone!.hours}
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <span className="muted small"> · passed {p.milestone!.hours} hours {ago(p.milestone!.at)}</span>
                      </span>
                    </span>
                    {email && (
                      <a className="btn btn-sm" href={milestoneThanks(org, p.name, email, p.milestone!.hours, upcoming[0])}>
                        Thank them
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="small muted card-pad" style={{ paddingTop: 8 }}>
            Recognition is one of the reasons volunteers stay. Two lines from you is enough.
          </p>
        </section>
      </div>

      {upcoming.length > 0 && (
        <section className="stack">
          <h2>Coming up</h2>
          <div className="card">
            <ul className={s.list}>
              {upcoming.map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{e.title}</strong>
                    <span className="muted small"> · {fmtDay(e.starts_at)}{e.goal_text ? ` · goal: ${e.goal_text}` : ''}</span>
                  </span>
                  <Link className="btn btn-sm" href={`/org/events/${e.id}`}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, spark, prefix, decimals = 0, warn, delay = 0 }: { label: string; value: number; sub: string; spark?: number[]; prefix?: string; decimals?: number; warn?: boolean; delay?: number }) {
  return (
    <div className={s.kpi}>
      <p className={s.kpiLabel}>{label}</p>
      <div className={s.kpiRow}>
        <p className={s.kpiNum}>
          <CountUp value={value} prefix={prefix} decimals={decimals} delay={delay} />
        </p>
        {spark && spark.length > 1 && <Sparkline points={spark} color="#8fd3ab" delay={0.3 + delay} />}
      </div>
      <p className={`${s.kpiSub} ${warn ? s.kpiWarn : ''}`}>{sub}</p>
    </div>
  );
}

export const instant = false;
