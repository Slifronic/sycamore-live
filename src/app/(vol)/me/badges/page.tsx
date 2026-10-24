import Link from 'next/link';
import { requireVolunteer } from '@/lib/vol-data';
import { volunteerBadges, type VolBadge } from '@/lib/vol-badges';
import { plural } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import { BadgeEmblem } from '@/components/vol/BadgeEmblem';
import { longDay, targetLine } from '@/components/vol/badge-format';
import { EmptyState } from '@/components/media/EmptyState';
import s from './badges.module.css';

// The badge gallery. Signed means an organization signed a badge_award row;
// "in progress" and "ready" are computed from attested hours with the rules in
// badges.ts and are never a credential on their own.

const STATE_CHIP: Record<VolBadge['state'], [string, string]> = {
  signed: ['✓ Signed', 'chip-green'],
  ready: ['Ready for sign-off', 'chip-green'],
  progress: ['In progress', 'chip-ink'],
  locked: ['Not started', 'chip-ink'],
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'signed', label: 'Signed' },
  { key: 'progress', label: 'In progress' },
  { key: 'locked', label: 'Not started' },
] as const;

function blurb(b: VolBadge) {
  const a = b.awards[0];
  if (b.state === 'signed' && a) return `Issued by ${a.org.name}. Signed by ${a.signed_by} on ${longDay(a.signed_at)}.`;
  if (b.state === 'ready' && b.best) return `You meet ${b.best.org.name}’s rule. It becomes a badge when ${b.best.org.coordinator_name} signs it.`;
  if (b.state === 'progress' && b.best) return `Counting the events ${b.best.org.name} has verified. ${b.def.rule}.`;
  return b.def.rule + '.';
}

export default async function BadgesPage({ searchParams }: PageProps<'/me/badges'>) {
  const vol = await requireVolunteer('/me/badges');
  const raw = (await searchParams).show;
  const show = FILTERS.some((f) => f.key === raw) ? (raw as (typeof FILTERS)[number]['key']) : 'all';
  const badges = await volunteerBadges(vol.id);
  const signed = badges.filter((b) => b.state === 'signed').length;
  const inState = (b: VolBadge) => show === 'all' || (show === 'progress' ? b.state === 'progress' || b.state === 'ready' : b.state === show);
  const list = badges.filter(inState);
  const next = [...badges].filter((b) => b.state === 'ready' || b.state === 'progress').sort((a, b) => (b.best?.progress ?? 0) - (a.best?.progress ?? 0))[0];

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Your work, recognized"
        title="My badges"
        lede="Signed by the organizations that saw the work. Progress comes only from hours they’ve attested."
        action={<span className={`chip ${signed ? 'chip-green' : 'chip-ink'}`}>{plural(signed, 'signed badge')}</span>}
      />

      {next && next.best && (
        <Link href={`/me/badges/${next.def.key}`} className={`card lift ${s.feature}`}>
          <BadgeEmblem badge={next.def.key} state={next.state} size="lg" />
          <div className={s.featureBody}>
            <span className="eyebrow">{next.state === 'ready' ? 'Ready for sign-off' : 'Up next'}</span>
            <h2>{next.def.name}</h2>
            <p className="small muted">{blurb(next)}</p>
            <div className="bar bar-grow" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(next.best.progress * 100)} aria-label={`${next.def.name} progress`}>
              <span style={{ width: `${Math.round(next.best.progress * 100)}%` }} />
            </div>
            <span className="small muted">{targetLine(next)}</span>
          </div>
          <span className={s.arrow} aria-hidden>
            →
          </span>
        </Link>
      )}

      <Segmented id="badge-filter" label="Show badges" items={FILTERS.map((f) => ({ href: f.key === 'all' ? '/me/badges' : `/me/badges?show=${f.key}`, label: f.label, on: show === f.key }))} />

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            illo="leaf-badge"
            title={show === 'signed' ? 'No signed badges yet.' : 'Nothing here right now.'}
            action={
              <Link className="btn" href="/me/badges">
                See all badges
              </Link>
            }
          >
            {show === 'signed'
              ? 'A badge is signed by the organization once your attested hours meet its rule. Take on a role at your next event to get started.'
              : 'Every badge you’ve started is under another filter.'}
          </EmptyState>
        </div>
      ) : (
        <div className={s.grid}>
          {list.map((b, i) => {
            const [label, chip] = STATE_CHIP[b.state];
            const pct = Math.round((b.best?.progress ?? 0) * 100);
            return (
              <Link key={b.def.key} href={`/me/badges/${b.def.key}`} className={`card lift fade-in ${s.tile}`} style={{ ['--d' as string]: `${i * 0.06}s` }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <BadgeEmblem badge={b.def.key} state={b.state} />
                  <span className={`chip ${chip}`}>{label}</span>
                </div>
                <h3 className={s.tileTitle}>{b.def.name}</h3>
                <p className="small muted">{blurb(b)}</p>
                {b.state !== 'signed' && (
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="bar bar-grow" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="small muted">{b.best ? targetLine(b) : 'No attested hours toward this yet'}</span>
                  </div>
                )}
                <span className={s.more}>{b.state === 'signed' ? 'Evidence, certificate and sharing →' : 'See the rule →'}</span>
              </Link>
            );
          })}
        </div>
      )}

      <p className="notice notice-green small">
        A badge is earned only when its organization signs it. Progress here is computed from your attested hours with each organization, so it moves when a coordinator verifies an event, never from a check-in alone.
      </p>
      <Link href="/me/journey" className={s.link}>
        See the service behind your badges →
      </Link>
    </div>
  );
}

export const instant = false;
