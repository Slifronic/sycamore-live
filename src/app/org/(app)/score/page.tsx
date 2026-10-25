import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import Link from 'next/link';
import { IndexCard } from '@/components/IndexCard';
import { PageHeader } from '@/components/PageHeader';
import s from './score.module.css';

export const metadata = { title: 'Score' };

const TIERS = [
  { name: 'Platinum', from: 90 },
  { name: 'Gold', from: 75 },
  { name: 'Silver', from: 60 },
  { name: 'Bronze', from: 45 },
];

export default async function IndexPage() {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const lowest = ins.index.parts.filter((p) => p.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const score = ins.index.score;
  const nextTier = score == null ? null : [...TIERS].reverse().find((t) => t.from > score);

  const focusHref = { retention: '/org/volunteers?tab=away', efficiency: '/org/events', completion: '/org/events' } as const;
  const focusCta = { retention: 'See who hasn’t come in 30+ days →', efficiency: 'Events waiting to verify →', completion: 'Set a goal on your next event →' } as const;

  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow-sap">Proof · from {ins.totals.verifiedEvents} verified events</span>}
        title="Your SycaMore Index"
        lede="One number from 0 to 100 that shows a funder your program runs well. You never type anything into it: it comes from check-ins and the two-minute verify."
      />

      <div className={s.top}>
        <IndexCard index={ins.index} full />

        {lowest && (
          <section className={`card ${s.focus}`}>
            <p className="eyebrow" style={{ color: 'var(--amber)' }}>Where to focus next</p>
            <h2>{lowest.label}</h2>
            <p className={s.focusFig}>
              <span className="figure" style={{ fontSize: 48 }}>{lowest.score}</span>
              <span className="figure-unit">your lowest part</span>
            </p>
            <p>{lowest.how}</p>
            {nextTier && score != null && (
              <p className="small" style={{ color: 'var(--amber)', fontWeight: 700 }}>
                {nextTier.from - score} more {nextTier.from - score === 1 ? 'point reaches' : 'points reach'} {nextTier.name}.
              </p>
            )}
            <Link className="btn btn-primary" href={focusHref[lowest.key]} style={{ justifySelf: 'start', marginTop: 4 }}>
              {focusCta[lowest.key]}
            </Link>
          </section>
        )}
      </div>

      <section className="card card-pad stack">
        <h2>How it’s calculated</h2>
        {score != null && (
          <div className={s.formula} aria-label={`Index = ${ins.index.parts.map((p) => `${p.score} times ${p.weight}`).join(' plus ')} = ${score}`}>
            {ins.index.parts.map((p, i) => (
              <span key={p.key} className={s.term} aria-hidden>
                {i > 0 && <span className={s.op}>+</span>}
                <span className={s.tile}>
                  <span className="figure" style={{ fontSize: 24 }}>{p.score}</span>
                  <span className={s.times}>× {p.weight.toFixed(2)}</span>
                  <span className={s.tileLabel}>{p.label}</span>
                </span>
              </span>
            ))}
            <span className={s.op} aria-hidden>=</span>
            <span className={`${s.tile} ${s.total}`} aria-hidden>
              <span className="figure" style={{ fontSize: 30, color: '#fff' }}>{score}</span>
              <span className={s.tileLabel} style={{ color: '#b8d4c2' }}>Index</span>
            </span>
          </div>
        )}
        <ul className="stack small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <strong>Volunteer retention (× 0.35):</strong> of volunteers whose first event was at least two weeks ago, the share who came back for another.
          </li>
          <li>
            <strong>Coordinator efficiency (× 0.30):</strong> how quickly events get verified after they end (same day scores 100). The app measures this;
            nobody self-reports it.
          </li>
          <li>
            <strong>Event completion (× 0.35):</strong> your answer to “did the event achieve its goal?” at close. Yes counts 100, partly 55, no 0.
          </li>
        </ul>
        <div className={s.tiers} aria-label="Tiers">
          {TIERS.map((t) => (
            <span key={t.name} className={`chip ${t.name === ins.index.tier ? (t.from >= 75 ? 'chip-gold' : 'chip-silver') : 'chip-ink'}`}>
              {t.name === ins.index.tier ? '★ ' : ''}
              {t.name} {t.from}+
            </span>
          ))}
        </div>
        <p className="small muted">
          The tier is provisional until three events are verified. Event completion is your own answer, so the funder report labels it that way.
        </p>
      </section>
    </div>
  );
}

export const instant = false;
