import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { LESSONS, courseProgress } from '@/lib/course';
import { badgeByKey } from '@/lib/badges';
import { HOUR_RATES, money, rateKeyFor, usd } from '@/lib/value';
import { ago, fmtDay, fmtHoursSafe, plural } from './util';
import { IndexCard } from '@/components/IndexCard';
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
  const hourRate = HOUR_RATES[rateKeyFor(org.city)];
  const value = ins.totals.verifiedHours * hourRate.usd;
  const hour = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false });
  const greet = Number(hour) < 12 ? 'Good morning' : Number(hour) < 18 ? 'Good afternoon' : 'Good evening';
  const needs = ins.awaiting.length + (ins.badgeReady.length ? 1 : 0) + (ins.slipping.length ? 1 : 0);

  return (
    <div className={s.page}>
      <header className="row between wrap">
        <div>
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

      {!course.complete && course.next && (
        <section className={`card ${s.lesson}`}>
          <div>
            <p className={s.eyebrow}>
              Lesson {LESSONS.indexOf(course.next) + 1} of {course.total} · {course.next.minutes} min
            </p>
            <h2>{course.next.title}</h2>
            <p className="muted">{course.next.why}</p>
          </div>
          <div className="row wrap">
            <Link className="btn btn-primary" href={course.next.href}>
              Try it now
            </Link>
            <Link className="btn btn-quiet" href="/org/learn">
              All lessons
            </Link>
          </div>
        </section>
      )}

      {live.length > 0 && (
        <section className="stack">
          <h2>Happening now</h2>
          {live.map((e) => (
            <Link key={e.id} href={`/org/events/${e.id}`} className={`card ${s.live}`}>
              <span className={s.pulse} aria-hidden />
              <span style={{ flex: 1 }}>
                <strong>{e.title}</strong>
                <span className="muted small"> · code {e.checkin_code}</span>
              </span>
              <span className="btn btn-sm">Open check-in →</span>
            </Link>
          ))}
        </section>
      )}

      {(ins.awaiting.length > 0 || ins.badgeReady.length > 0) && (
        <section className="stack">
          <h2>Needs you</h2>
          <div className={s.needs}>
            {ins.awaiting.map((e) => (
              <div key={e.id} className={`card ${s.need}`}>
                <span className="chip chip-amber">Needs verification</span>
                <h3>{e.title}</h3>
                <p className="muted small">
                  Ended {ago(e.ends_at)} · verifying takes about 2 minutes
                </p>
                <Link className="btn btn-primary btn-sm" href={`/org/events/${e.id}/verify`}>
                  Verify now
                </Link>
              </div>
            ))}
            {ins.badgeReady.length > 0 && (
              <div className={`card ${s.need}`}>
                <span className="chip chip-amber">{plural(ins.badgeReady.length, 'badge')} ready</span>
                <h3>Ready for your sign-off</h3>
                <p className="muted small">
                  {ins.badgeReady
                    .slice(0, 3)
                    .map((b) => `${b.v.name} · ${badgeByKey[b.badge].name}`)
                    .join(' · ')}
                </p>
                <Link className="btn btn-sm" href="/org/badges">
                  Review badges
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <section className={s.stats}>
        <Stat label="Verified hours" value={fmtHoursSafe(ins.totals.verifiedHours)} />
        <Stat label="Volunteers" value={ins.totals.uniqueVolunteers.toLocaleString()} sub={`${ins.totals.attendances.toLocaleString()} attendances`} />
        <Stat label="Events verified" value={String(ins.totals.verifiedEvents)} sub={ins.awaiting.length ? `${ins.awaiting.length} waiting` : 'all caught up'} />
        <Stat label="Value of volunteer time" value={usd(value)} sub={`at ${money(hourRate.usd)}/hr (${hourRate.label})`} />
      </section>

      <div className={s.two}>
        <IndexCard index={ins.index} />

        <section className="card">
          <div className="card-head">
            <h2>Slipping away</h2>
            <span className="chip chip-ink">{ins.slipping.length}</span>
          </div>
          {ins.slipping.length === 0 ? (
            <p className="card-pad muted">Nobody who came twice has been gone more than a month. Nice.</p>
          ) : (
            <ul className={s.list}>
              {ins.slipping.slice(0, 6).map((v) => (
                <li key={v.key}>
                  <span>
                    <strong>{v.name}</strong>
                    <span className="muted small"> · {v.events} events · last came {ago(v.last_seen)}</span>
                  </span>
                  <Link className="btn btn-sm" href={`/org/volunteers?invite=${encodeURIComponent(v.key)}`}>
                    Invite back
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted card-pad" style={{ paddingTop: 0 }}>
            People who came at least twice and haven’t been back in 30 days. A personal invite is the best way to keep them.
          </p>
        </section>
      </div>

      {ins.milestones.length > 0 && (
        <section className="stack">
          <h2>Milestones to celebrate</h2>
          <div className={s.needs}>
            {ins.milestones.slice(0, 6).map((v) => {
              const email = v.volunteer_id ? emails.get(v.volunteer_id) : undefined;
              return (
                <div key={v.key} className={`card ${s.need}`} style={{ borderColor: '#e3cf8f' }}>
                  <span className="chip chip-gold">★ {v.milestone!.hours} hours</span>
                  <h3>{v.name}</h3>
                  <p className="muted small">
                    Passed {v.milestone!.hours} verified hours {ago(v.milestone!.at)} · {v.events} events with you
                  </p>
                  {email && (
                    <a className="btn btn-sm" href={milestoneThanks(org, v.name, email, v.milestone!.hours, upcoming[0])}>
                      Send a thank-you
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <p className="small muted">Recognition is one of the reasons volunteers stay. A two-line note from you is enough.</p>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="stack">
          <h2>Coming up</h2>
          <div className="card">
            <ul className={s.list}>
              {upcoming.map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{e.title}</strong>
                    <span className="muted small"> · {fmtDay(e.starts_at)}</span>
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`card ${s.stat}`}>
      <p className="muted small">{label}</p>
      <p className={`${s.statNum} num`}>{value}</p>
      {sub && <p className="muted small">{sub}</p>}
    </div>
  );
}

export const instant = false;
