import Link from 'next/link';
import { cookies } from 'next/headers';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights, weeklyTrend } from '@/lib/insights';
import { courseProgress } from '@/lib/course';
import { badgeByKey } from '@/lib/badges';
import { ago, fmtDay, fmtTime, plural } from './util';
import { requestNow } from '@/lib/format';
import { sql } from '@/lib/db';
import { StatCard } from '@/components/ui/StatCard';
import { CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { Sparkline } from '@/components/motion/Sparkline';
import { HomeChart } from './HomeChart';
import { LessonHint } from './LessonHint';
import s from './home.module.css';

export const metadata = { title: 'Home' };

const DAY = 86_400_000;
const fmtH = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });

// Home (REDESIGN-2026-10-25, round 2): a full-width welcome strip that says
// what needs you, a row of three stat cards with 13-week trend lines, then the
// one chart beside what's happening now or next. Everything else
// lives on its own page (volunteers: away and milestones; reports: value of
// volunteer time; learn: the course).
export default async function OrgHome({ searchParams }: PageProps<'/org'>) {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const course = courseProgress(org.course);
  const welcome = (await searchParams).welcome === '1';
  const hideLesson = (await cookies()).get('sm-hide-lesson')?.value === '1';
  const now = requestNow();

  const live = ins.events.filter((e) => !e.attested_at && new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() >= now);
  const upcoming = ins.events.filter((e) => new Date(e.starts_at).getTime() > now && !e.is_practice).slice(-3).reverse();
  const hereNow = new Map(
    ((await sql`select event_id, count(*)::int as n from attendance where event_id = any(${live.map((e) => e.id)}) and status = 'checked_in' group by event_id`) as unknown as {
      event_id: string;
      n: number;
    }[]).map((r) => [r.event_id, r.n]),
  );

  const first = org.coordinator_name.split(' ')[0];
  const today = new Date(now).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'short', day: 'numeric' });
  const clock = new Date(now).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });

  // What needs you: oldest unverified event first, then badges to sign. At most two rows.
  const awaiting = [...ins.awaiting].sort((a, b) => +new Date(a.ends_at) - +new Date(b.ends_at));
  const badges = ins.badgeReady;
  const asks: string[] = [];
  if (awaiting.length) asks.push(`${plural(awaiting.length, 'event')} waiting to be verified`);
  if (badges.length) asks.push(`${plural(badges.length, 'badge')} ready to sign`);
  const next = upcoming[0];
  const sentence = asks.length
    ? `${asks.join(' and ')}.`
    : next
      ? `Nothing needs you right now. Next up: ${next.title}, ${fmtDay(next.starts_at)}.`
      : 'Nothing needs you right now.';

  // Stat cards. Trend lines are weekly running totals over the last 13 weeks
  // (real rows, so the last point is the headline number).
  const since = now - 30 * DAY;
  const hours30 = ins.series.filter((p) => p.date.getTime() >= since).reduce((n, p) => n + p.hours, 0);
  const trend = weeklyTrend(ins, now);
  const new30 = ins.volunteers.filter((v) => v.first_seen.getTime() >= since).length;
  const verifiedByDate = [...ins.verified].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const pips = verifiedByDate.slice(-8).map((e) => new Date(e.attested_at!).getTime() - new Date(e.ends_at).getTime() <= DAY);
  const chart = ins.series.slice(-8).map((p) => ({ ...p, date: p.date.toISOString() }));
  const chartHours = chart.reduce((n, p) => n + p.hours, 0);

  return (
    <Stagger className={s.home}>
      {/* 1 · Welcome strip: the day and one sentence on the left, at most two things to do on the right. */}
      <section className={`card ${s.welcome}`} aria-labelledby="home-title">
        <div className={s.welcomeText}>
          <p className={s.dateChip}>
            <span className={s.dateDot} aria-hidden />
            {today} · {clock}
          </p>
          <h1 id="home-title" className={s.hello}>
            Welcome back, {first}
          </h1>
          <p className={s.sentence}>{sentence}</p>
          {welcome && (
            <p className={s.setup}>
              <Icon name="key" size={16} />
              <span>
                You’re set up. Your sign-in PIN is <strong className="num">{org.coordinator_pin}</strong>; write it down. A practice event is ready to try.
              </span>
            </p>
          )}
          {!course.complete && course.next && !hideLesson && (
            <LessonHint done={course.done} total={course.total} title={course.next.title} minutes={course.next.minutes} href={course.next.href} />
          )}
        </div>

        {(awaiting.length > 0 || badges.length > 0) && (
          <ul className={s.asks}>
            {awaiting.length > 0 && (
              <li className={s.ask}>
                <span className={s.askIcon} data-tone="amber" aria-hidden>
                  <Icon name="clock" size={16} />
                </span>
                <span className={s.askText}>
                  <strong>{awaiting[0].title}</strong>
                  <span>
                    Ended {ago(awaiting[0].ends_at, new Date(now))}
                    {awaiting.length > 1 ? ` · ${awaiting.length - 1} more after this` : ' · takes about 2 min'}
                  </span>
                </span>
                <Link className="btn btn-primary btn-sm" href={`/org/events/${awaiting[0].id}/verify`}>
                  Verify
                </Link>
              </li>
            )}
            {badges.length > 0 && (
              <li className={s.ask}>
                <span className={s.askIcon} data-tone="gold" aria-hidden>
                  <Icon name="award" size={16} />
                </span>
                <span className={s.askText}>
                  <strong>{plural(badges.length, 'badge')} to sign</strong>
                  <span>
                    {badges
                      .slice(0, 2)
                      .map((b) => `${b.v.name.split(' ')[0]} · ${badgeByKey[b.badge].name}`)
                      .join(', ')}
                    {badges.length > 2 ? ` +${badges.length - 2}` : ''}
                  </span>
                </span>
                <Link className={`btn btn-sm ${awaiting.length ? '' : 'btn-primary'}`} href="/org/badges">
                  Review
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* 2 · Three numbers. */}
      <StatCard
        className={s.stat}
        label="Verified hours"
        value={ins.totals.verifiedHours}
        decimals={ins.totals.verifiedHours % 1 ? 1 : 0}
        unit="hrs"
        icon="clock"
        delta={hours30 > 0 ? { value: `+${fmtH(hours30)} in 30d`, dir: 'up', label: 'in the last 30 days' } : undefined}
        foot="Last 13 weeks"
        sparkSlot={<Trend points={trend.hours} label="Verified hours, week by week" />}
        href="/org/reports"
      />
      <StatCard
        className={s.stat}
        label="Unique volunteers"
        value={ins.totals.uniqueVolunteers}
        icon="users"
        iconTone="mist"
        delta={new30 > 0 ? { value: `+${new30} new in 30d`, dir: 'up', label: 'new in the last 30 days' } : undefined}
        foot="Last 13 weeks"
        sparkSlot={<Trend points={trend.people} label="Unique volunteers, week by week" delay={0.08} />}
        href="/org/volunteers"
      />
      <StatCard
        className={s.stat}
        label="Verified within 24h"
        value={ins.totals.verifiedWithin24h}
        unit={`of ${ins.totals.verifiedEvents}`}
        icon="hourglass"
        iconTone="butter"
        foot={
          awaiting.length ? (
            <span className={s.waiting}>{plural(awaiting.length, 'event')} waiting</span>
          ) : ins.totals.verifiedEvents ? (
            'events, timed from their end'
          ) : (
            'Verify an event to start'
          )
        }
        sparkSlot={
          pips.length > 0 && (
            <span className={s.pips} aria-hidden>
              {pips.map((ok, i) => (
                <i key={i} data-ok={ok || undefined} style={{ ['--i' as string]: i }} />
              ))}
            </span>
          )
        }
        href="/org/events"
      />

      {/* 3 · The one chart. */}
      <section className={`card ${s.chartCard}`} aria-labelledby="chart-title">
        <CardHeader
          id="chart-title"
          title="Hours by event"
          action={
            <Link className="btn btn-sm btn-quiet" href="/org/reports">
              Funder report <Icon name="arrow-right" size={14} />
            </Link>
          }
        />
        {chart.length ? (
          <HomeChart points={chart} />
        ) : (
          <p className={s.chartEmpty}>
            <Icon name="chart" size={20} />
            Verify your first event and its hours show up here.
          </p>
        )}
        {chart.length > 0 && (
          <p className={s.chartFoot}>
            Last {plural(chart.length, 'verified event')} · {fmtH(chartHours)} hours · {ins.totals.attendances.toLocaleString()} attendances in all
          </p>
        )}
      </section>

      {/* 4 · Happening now, or next. The one dark panel. */}
      <section className={s.now} aria-labelledby="now-title">
        {live.length > 0 ? (
          <>
            <p className={s.nowEyebrow} id="now-title">
              <span className={s.pulse} aria-hidden /> Live now{live[0].is_practice ? ' · practice' : ''}
            </p>
            <Link href={`/org/events/${live[0].id}`} className={s.nowMain}>
              <strong className={s.nowTitle}>{live[0].title}</strong>
              <span className={s.nowWhen}>
                {fmtTime(live[0].starts_at)} – {fmtTime(live[0].ends_at)}
              </span>
              <span className={s.nowRow}>
                <span className={s.nowCount}>
                  <span className={s.nowNum}>{hereNow.get(live[0].id) ?? 0}</span> here now
                </span>
                <span className={s.code} aria-label={`Check-in code ${live[0].checkin_code}`}>
                  {live[0].checkin_code}
                </span>
              </span>
              <span className={s.nowCta}>
                Open check-in <Icon name="arrow-right" size={16} />
              </span>
            </Link>
            {live.length > 1 && (
              <Link className={s.nowMore} href={`/org/events/${live[1].id}`}>
                Also live: {live[1].title}
                {live.length > 2 ? ` +${live.length - 2}` : ''}
              </Link>
            )}
          </>
        ) : (
          <>
            <p className={s.nowEyebrow} id="now-title">
              <Icon name="calendar" size={14} /> Next up
            </p>
            {next ? (
              <Link href={`/org/events/${next.id}`} className={s.nowMain}>
                <strong className={s.nowTitle}>{next.title}</strong>
                <span className={s.nowWhen}>{fmtDay(next.starts_at)}</span>
                <span className={s.nowCta}>
                  Open event <Icon name="arrow-right" size={16} />
                </span>
              </Link>
            ) : (
              <div className={s.nowMain}>
                <strong className={s.nowTitle}>Nothing scheduled</strong>
                <Link className={s.nowCta} href="/org/events/new">
                  Plan an event <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            )}
          </>
        )}
        {upcoming.length > (live.length ? 0 : 1) && (
          <ul className={s.nowList} aria-label="Coming up">
            {upcoming.slice(live.length ? 0 : 1, 3).map((e) => (
              <li key={e.id}>
                <Link href={`/org/events/${e.id}`}>
                  <span>{e.title}</span>
                  <span className={s.nowListDay}>{fmtDay(e.starts_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Stagger>
  );
}

// A stat card's trend line: 13 weekly points, drawn in once. Flat when nothing
// changed, never padded with made-up points.
function Trend({ points, label, delay = 0 }: { points: number[]; label: string; delay?: number }) {
  if (points.length < 8 || points.every((p) => p === points[0])) return null;
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return (
    <span className={s.trend} role="img" aria-label={`${label}: ${fmt(points[0])} to ${fmt(points.at(-1)!)}`}>
      <Sparkline points={points} width={132} height={36} area delay={delay} className={s.trendSvg} />
    </span>
  );
}

export const instant = false;
