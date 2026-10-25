import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { loadOrgInsights } from '@/lib/insights';
import { ago, fmtDay, requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { FocusOnMount } from './FocusOnMount';
import { VerifyConsole } from './VerifyConsole';
import s from './verify.module.css';

export const metadata = { title: 'Verify hours' };

export default async function VerifyPage({ params, searchParams }: PageProps<'/org/events/[id]/verify'>) {
  const org = await requireOrg();
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const roster = await getRoster(id);

  if (event.attested_at) {
    // Shown right after Verify & close (and on any later visit). `from` is the
    // org's verified hours before this verify, so the screen can say what changed.
    const ins = await loadOrgInsights(org.id);
    const issued = roster.filter((r) => r.status === 'attested').length;
    const fromParam = (await searchParams).from;
    const fromRaw = typeof fromParam === 'string' && fromParam !== '' ? Number(fromParam) : NaN;
    const from = Number.isFinite(fromRaw) && fromRaw >= 0 ? fromRaw : null;
    const added = from != null ? Math.round((ins.totals.verifiedHours - from) * 100) / 100 : 0;
    const t = ins.totals;
    return (
      <section className={`card ${s.done}`} style={{ maxWidth: 760 }}>
        <p className={s.check} aria-hidden>✓</p>
        <h1 id="done-title" tabIndex={-1}>
          {issued} hour {issued === 1 ? 'record' : 'records'} issued
        </h1>
        <FocusOnMount id="done-title" />
        <p className="muted">
          {event.is_practice
            ? 'That’s the whole loop. On a real event, every volunteer could now share their record from their phone.'
            : `${event.title} is verified. Volunteers can share their records from their phones now.`}
        </p>
        {!event.is_practice && (
          <div className={s.celebrate}>
            <div className={s.celebrateText}>
              <p className="eyebrow eyebrow-sap">Now on your record</p>
              <ul className={s.factList}>
                <li>
                  <b className="num">{t.verifiedHours.toLocaleString()}</b> verified hours{added > 0 ? ` (${added.toLocaleString()} added just now)` : ''}
                </li>
                <li>
                  <b className="num">{t.attendances.toLocaleString()}</b> attendances
                </li>
                <li>
                  <b className="num">{t.uniqueVolunteers.toLocaleString()}</b> unique volunteers
                </li>
                <li>
                  <b className="num">
                    {t.verifiedWithin24h} of {t.verifiedEvents}
                  </b>{' '}
                  events verified within 24 hours of ending
                </li>
              </ul>
              {ins.badgeReady.length > 0 && <p className="small muted">{ins.badgeReady.length} badges are ready for your sign-off.</p>}
            </div>
          </div>
        )}
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" href="/org">
            Back to dashboard
          </Link>
          <Link className="btn" href="/org/reports">
            Funder report
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

  const before = (await loadOrgInsights(org.id)).totals.verifiedHours;

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={
          <span className="row wrap" style={{ gap: 8 }}>
            <span className="chip chip-amber" style={{ letterSpacing: 0, textTransform: 'none' }}>
              Needs verification
            </span>
            <Link href={`/org/events/${id}`}>{fmtDay(event.starts_at)}</Link>
            {new Date(event.ends_at).getTime() < requestNow() ? <span>· ended {ago(event.ends_at)}</span> : null}
          </span>
        }
        title={`Verify ${event.title}`}
        lede={`${roster.length} people. Hours are filled in from the scans: answer the goal question, set roles, star anyone who stood out, then verify. This replaces signing hour letters.`}
      />
      <VerifyConsole eventId={id} before={before} goalText={event.goal_text} signer={`${org.coordinator_name}, ${org.name}`} endsAt={new Date(event.ends_at).toISOString()} initial={JSON.parse(JSON.stringify(roster))} />
    </div>
  );
}

export const instant = false;
