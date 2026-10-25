'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import s from './chart.module.css';

type Point = { id: string; title: string; date: string; hours: number; people: number };

// Verified hours per event as rounded bars, growing in once. Hover or focus a
// bar to see its value pill; each bar is a button with a full spoken label.
export function HoursChart({ points }: { points: Point[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.hours));
  const label = (p: Point) => new Date(p.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' });

  if (points.length === 0) return <p className="muted small">Verify an event to see its hours here.</p>;

  return (
    <div style={{ height: '100%' }}>
      <div className={s.plot} role="group" aria-label="Verified hours per event. Tap or focus a bar for its numbers.">
        {points.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`${s.col} ${active === i ? s.on : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${p.title}: ${p.hours} hours, ${p.people} volunteers`}
          >
            {active === i && (
              <span className={s.pill}>
                {p.hours} hrs · {p.people} people
              </span>
            )}
            <motion.span
              className={s.bar}
              style={{ height: `${(p.hours / max) * 100}%`, transformOrigin: 'bottom' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className={s.x}>{label(p)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
