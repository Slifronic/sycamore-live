'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CountUp } from './CountUp';

// The Index gauge from the pitch walkthrough: a 270° ring that opens at the
// bottom, filled with the sap-to-canopy gradient, the score inside.
const R = 66;
const C = 2 * Math.PI * R; // ~414.7
const ARC = C * 0.75; // the visible 270°

export function Gauge({ value, from = 0, size = 168 }: { value: number | null; from?: number; size?: number }) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(100, value ?? 0));
  const target = (ARC * v) / 100;
  const start = (ARC * Math.max(0, Math.min(100, from))) / 100;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 160 160" aria-hidden>
        <defs>
          <linearGradient id="gauge-fill" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#6fbf90" />
            <stop offset="1" stopColor="#1b4632" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--rule-soft)" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${ARC} ${C}`} transform="rotate(135 80 80)" />
        {value != null && v > 0 && (
          <motion.circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="url(#gauge-fill)"
            strokeWidth="13"
            strokeLinecap="round"
            transform="rotate(135 80 80)"
            initial={reduce ? false : { strokeDasharray: `${start} ${C}` }}
            animate={{ strokeDasharray: `${target} ${C}` }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div className="figure" style={{ fontSize: size * 0.36 }}>
            {value == null ? '—' : <CountUp value={value} from={from} duration={1.4} />}
          </div>
          <div className="eyebrow" style={{ marginTop: 4, color: 'var(--field)' }}>of 100</div>
        </div>
      </div>
    </div>
  );
}

// Input bars under the gauge: each fills in turn.
export function GrowBar({ value, index = 0 }: { value: number | null; index?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="bar">
      <motion.span
        initial={reduce ? false : { width: '0%' }}
        animate={{ width: `${value ?? 0}%` }}
        transition={{ duration: 1.2, delay: 0.15 + index * 0.16, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
