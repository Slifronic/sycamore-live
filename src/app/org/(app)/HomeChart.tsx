'use client';

import { useState } from 'react';
import s from './home.module.css';

type Point = { id: string; title: string; date: string; hours: number; people: number };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' });
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });

/** A round axis top: 1, 2, 2.5 or 5 times a power of ten, at or above the max. */
function niceMax(max: number) {
  if (max <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * p >= max)! * p;
  return step;
}

/**
 * Verified hours per event (Home's one chart). Columns on a quiet grid; the
 * hovered or focused one turns solid and shows a tooltip card. Each column is
 * a button with a full spoken label. The bars grow in with CSS only, so the
 * chart is drawn without JavaScript and reduced motion shows it at rest.
 */
export function HomeChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const top = niceMax(Math.max(...points.map((p) => p.hours), 0));
  const ticks = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const last = points.length - 1;

  return (
    <div className={s.chart}>
      <div className={s.yAxis} aria-hidden>
        {ticks.map((t) => (
          <span key={t}>{fmt(t)}</span>
        ))}
      </div>
      <div className={s.plot} role="group" aria-label="Verified hours per event" onMouseLeave={() => setActive(null)}>
        <div className={s.grid} aria-hidden>
          {ticks.map((t) => (
            <i key={t} />
          ))}
        </div>
        {points.map((p, i) => {
          const on = active === i;
          return (
            <button
              key={p.id}
              type="button"
              className={s.col}
              data-on={on || undefined}
              data-dim={active != null && !on ? '' : undefined}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(on ? null : i)}
              aria-label={`${p.title}, ${day(p.date)}: ${fmt(p.hours)} hours, ${p.people} volunteers`}
            >
              <span className={s.bar} style={{ height: `${(100 * p.hours) / top}%`, ['--i' as string]: i }} />
              <span className={s.x}>{day(p.date)}</span>
              {on && (
                <span className={s.tip} data-align={i === 0 && last > 0 ? 'start' : i === last && last > 0 ? 'end' : 'center'} style={{ bottom: `calc(${(100 * p.hours) / top}% + 10px)` }} aria-hidden>
                  <span className={s.tipTitle}>{p.title}</span>
                  <span className={s.tipRow}>
                    <span className={s.tipDot} />
                    <strong>{fmt(p.hours)}</strong> hrs
                    <span className={s.tipSep}>·</span>
                    <strong>{p.people}</strong> {p.people === 1 ? 'volunteer' : 'volunteers'}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
