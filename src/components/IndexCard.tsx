import Link from 'next/link';
import type { IndexResult } from '@/lib/insights';
import s from './index-card.module.css';

export function IndexCard({ index, full = false }: { index: IndexResult; full?: boolean }) {
  const score = index.score;
  return (
    <section className={`card ${s.card}`}>
      <div className={s.top}>
        <div>
          <p className={s.label}>SycaMore Index</p>
          <p className={s.score}>
            {score ?? '—'}
            <span className={s.of}>/ 100</span>
          </p>
          <p className={s.tier}>
            {score == null ? 'Verify 3 events to get your score' : `★ ${index.tier}${index.tier === 'Building' ? '' : ' certified'}`}
            {index.provisional && score != null && <span className="muted small"> · provisional until 3 events are verified</span>}
          </p>
        </div>
        <Ring value={score ?? 0} />
      </div>
      <div className={s.parts}>
        {index.parts.map((p) => (
          <div key={p.key} className={s.part}>
            <div className="row between">
              <span className={s.partLabel}>
                {p.label} <span className="muted small">×{p.weight.toFixed(2)}</span>
              </span>
              <strong className="num">{p.score ?? '—'}</strong>
            </div>
            <div className="bar">
              <span style={{ width: `${p.score ?? 0}%` }} />
            </div>
            {full ? (
              <>
                <p className="small muted">{p.detail}</p>
                <p className="small">
                  <strong>To raise it:</strong> {p.how}
                </p>
              </>
            ) : null}
          </div>
        ))}
      </div>
      {!full && (
        <div className="row between" style={{ padding: '0 20px 18px' }}>
          <p className="small muted">Updates every time you verify an event.</p>
          <Link className="btn btn-sm" href="/org/score">
            Open the Index →
          </Link>
        </div>
      )}
    </section>
  );
}

function Ring({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e9e7df" strokeWidth="8" />
      {value > 0 && (
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 44 44)" />
      )}
    </svg>
  );
}
