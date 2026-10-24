import Link from 'next/link';
import type { IndexResult } from '@/lib/insights';
import { Gauge, GrowBar } from './motion/Gauge';
import s from './index-card.module.css';

export function IndexCard({ index, full = false, from }: { index: IndexResult; full?: boolean; from?: number }) {
  const score = index.score;
  const certified = score != null && index.tier !== 'Building';
  return (
    <section className={`card ${s.card}`}>
      <div className={s.top}>
        <Gauge value={score} from={from ?? 0} size={full ? 184 : 156} />
        <div className={s.head}>
          <p className="eyebrow" style={{ color: 'var(--sap)' }}>SycaMore Index</p>
          {score == null ? (
            <p className={s.tierNone}>Verify 3 events to get your score</p>
          ) : (
            <p className={`${s.tier} ${certified ? s.tierGold : ''}`}>
              ★ {index.tier}
              {certified ? ' certified' : ''}
            </p>
          )}
          <p className="small muted">
            {index.provisional && score != null ? 'Provisional until 3 events are verified. ' : ''}
            Updates every time you verify an event.
          </p>
          {!full && (
            <Link className="btn btn-sm" href="/org/score" style={{ marginTop: 6, justifySelf: 'start' }}>
              Open the Index →
            </Link>
          )}
        </div>
      </div>
      <div className={s.parts}>
        {index.parts.map((p, i) => (
          <div key={p.key} className={s.part}>
            <div className="row between">
              <span className={s.partLabel}>
                {p.label} <span className={s.weight}>×{p.weight.toFixed(2)}</span>
              </span>
              <strong className="num">{p.score ?? '—'}</strong>
            </div>
            <GrowBar value={p.score} index={i} />
            {full && (
              <>
                <p className="small muted">{p.detail}</p>
                <p className="small">
                  <strong>To raise it:</strong> {p.how}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
