import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { loadOrgInsights } from '@/lib/insights';
import { fmtDay } from '@/lib/format';
import { VerifyConsole } from './VerifyConsole';
import s from './verify.module.css';

export default async function VerifyPage({ params }: PageProps<'/org/events/[id]/verify'>) {
  const org = await requireOrg();
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const roster = await getRoster(id);

  if (event.attested_at) {
    // Shown right after Verify & close (and on any later visit).
    const ins = await loadOrgInsights(org.id);
    const issued = roster.filter((r) => r.status === 'attested').length;
    return (
      <section className={`card ${s.done}`} style={{ maxWidth: 720 }}>
        <p className={s.check} aria-hidden>✓</p>
        <h1>{issued} hour records issued</h1>
        <p className="muted">
          {event.is_practice
            ? 'That’s the whole loop. On a real event, every volunteer could now share their record from their phone.'
            : `${event.title} is verified. Volunteers can share their records from their phones now.`}
        </p>
        {!event.is_practice && ins.index.score != null && (
          <p>
            Your SycaMore Index is now <strong>{ins.index.score}</strong> · <strong style={{ color: 'var(--gold)' }}>★ {ins.index.tier}</strong>
            {ins.badgeReady.length > 0 && <> · {ins.badgeReady.length} badges ready for your sign-off</>}
          </p>
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
      <VerifyConsole eventId={id} endsAt={new Date(event.ends_at).toISOString()} initial={JSON.parse(JSON.stringify(roster))} />
    </div>
  );
}

export const instant = false;
