import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { loadOrgInsights } from '@/lib/insights';
import { ago, fmtDay, requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { ToastOnMount } from '@/components/shell/Toast';
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
    const justNow = from != null;
    return (
      <Stagger className={s.doneWrap}>
        {justNow && <ToastOnMount id={`verified-${id}`} message={`${event.title} verified`} body={`${issued} hour ${issued === 1 ? 'record' : 'records'} issued.`} />}
        <section className={s.doneHead}>
          <span className={s.check} aria-hidden>
            <Icon name="check" size={32} strokeWidth={2.25} />
          </span>
          <h1 id="done-title" tabIndex={-1}>
            {issued} hour {issued === 1 ? 'record' : 'records'} issued
          </h1>
          <FocusOnMount id="done-title" />
          <p>
            {event.is_practice
              ? 'That’s the whole loop. On a real event, every volunteer could now share their record from their phone.'
              : `${event.title} is verified. Volunteers can share their records from their phones now.`}
          </p>
        </section>
        {!event.is_practice && (
          <section className={s.stats} aria-label="Now on your record">
            <StatCard
              label="Verified hours"
              value={t.verifiedHours}
              decimals={t.verifiedHours % 1 ? 1 : 0}
              unit="hrs"
              icon="clock"
              delta={added > 0 ? { value: `+${added.toLocaleString()}`, dir: 'up', label: 'added just now' } : undefined}
              foot={added > 0 ? 'added just now' : `${t.attendances.toLocaleString()} attendances`}
            />
            <StatCard label="Unique volunteers" value={t.uniqueVolunteers} icon="users" iconTone="mist" foot={`${t.attendances.toLocaleString()} attendances`} />
            <StatCard label="Verified within 24h" value={t.verifiedWithin24h} unit={`of ${t.verifiedEvents}`} icon="hourglass" iconTone="butter" foot="events, timed from their end" />
          </section>
        )}
        <div className={s.doneActions}>
          <Link className="btn btn-primary" href="/org">
            Back to Home
          </Link>
          <Link className="btn" href={`/org/events/${id}/story`}>
            Tell the story
          </Link>
          <Link className="btn" href="/org/reports">
            Funder report
          </Link>
          {ins.badgeReady.length > 0 && (
            <Link className="btn" href="/org/badges">
              Sign {ins.badgeReady.length} {ins.badgeReady.length === 1 ? 'badge' : 'badges'}
            </Link>
          )}
        </div>
      </Stagger>
    );
  }

  const before = (await loadOrgInsights(org.id)).totals.verifiedHours;

  return (
    <div className="page" style={{ gap: 16 }}>
      <PageHeader
        eyebrow={
          <span className="row wrap" style={{ gap: 8 }}>
            <span className="chip chip-amber" style={{ letterSpacing: 0, textTransform: 'none' }}>
              <Icon name="clock" size={14} strokeWidth={2} /> Needs verification
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>
              <Link href={`/org/events/${id}`}>{fmtDay(event.starts_at)}</Link>
              {new Date(event.ends_at).getTime() < requestNow() ? ` · ended ${ago(event.ends_at)}` : null}
            </span>
          </span>
        }
        title={`Verify ${event.title}`}
        lede={`${roster.length} people. Hours come from the scans; check them, answer the goal, verify.`}
      />
      <VerifyConsole eventId={id} before={before} goalText={event.goal_text} signer={`${org.coordinator_name}, ${org.name}`} coordinator={org.coordinator_name} endsAt={new Date(event.ends_at).toISOString()} initial={JSON.parse(JSON.stringify(roster))} />
    </div>
  );
}

export const instant = false;
