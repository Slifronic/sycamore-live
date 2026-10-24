import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { loadOrgInsights, tierFor } from '@/lib/insights';
import { Gauge } from '@/components/motion/Gauge';
import { CountUp } from '@/components/motion/CountUp';
import { fmtDay } from '@/lib/format';
import { VerifyConsole } from './VerifyConsole';
import s from './verify.module.css';

export default async function VerifyPage({ params, searchParams }: PageProps<'/org/events/[id]/verify'>) {
  const org = await requireOrg();
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const roster = await getRoster(id);

  if (event.attested_at) {
    // Shown right after Verify & close (and on any later visit). `from` is the
    // Index before this verify, so the gauge can count up to the new score.
    const ins = await loadOrgInsights(org.id);
    const issued = roster.filter((r) => r.status === 'attested').length;
    const fromRaw = Number((await searchParams).from);
    const from = Number.isFinite(fromRaw) && fromRaw > 0 ? fromRaw : null;
    const before = from != null ? tierFor(from) : null;
    const moved = before != null && before !== ins.index.tier;
    return (
      <section className={`card ${s.done}`} style={{ maxWidth: 760 }}>
        <p className={s.check} aria-hidden>✓</p>
        <h1>
          <CountUp value={issued} duration={0.8} /> hour records issued
        </h1>
        <p className="muted">
          {event.is_practice
            ? 'That’s the whole loop. On a real event, every volunteer could now share their record from their phone.'
            : `${event.title} is verified. Volunteers can share their records from their phones now.`}
        </p>
        {!event.is_practice && ins.index.score != null && (
          <div className={s.celebrate}>
            <Gauge value={ins.index.score} from={from ?? ins.index.score} size={176} />
            <div className={s.celebrateText}>
              <p className="eyebrow" style={{ color: 'var(--sap)' }}>Your SycaMore Index</p>
              {moved ? (
                <p className={s.tierMove}>
                  <span className={s.tierOld}>★ {before}</span> → <span className={`chip chip-gold ${s.tierPulse}`}>★ {ins.index.tier} certified</span>
                </p>
              ) : (
                <p className={s.tierMove}>
                  <span className="chip chip-gold">★ {ins.index.tier}</span>
                </p>
              )}
              <p className="small muted">
                {from != null && from !== ins.index.score ? `Up ${ins.index.score - from} points from ${from}. ` : ''}
                {ins.badgeReady.length > 0 ? `${ins.badgeReady.length} badges are ready for your sign-off.` : ''}
              </p>
            </div>
          </div>
        )}
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" href="/org">
            Back to dashboard
          </Link>
          <Link className="btn" href="/org/score">
            See your Index
          </Link>
          {ins.badgeReady.length > 0 && (
            <Link className="btn" href="/org/badges">
              Sign badges
            </Link>
          )}
        </div>
      </section>
    );
  }

  const before = (await loadOrgInsights(org.id)).index.score;

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 1120 }}>
      <header>
        <p className="small muted">
          <Link href="/org/events">Events</Link> / <Link href={`/org/events/${id}`}>{event.title}</Link>
        </p>
        <h1>Verify {event.title}</h1>
        <p className="muted">
          {fmtDay(event.starts_at)} · {roster.length} people. Hours are filled in from the scans. Set roles, star anyone who stood out, then verify.
          This replaces signing hour letters.
        </p>
      </header>
      <VerifyConsole eventId={id} before={before} goalText={event.goal_text} signer={`${org.coordinator_name}, ${org.name}`} endsAt={new Date(event.ends_at).toISOString()} initial={JSON.parse(JSON.stringify(roster))} />
    </div>
  );
}

export const instant = false;
