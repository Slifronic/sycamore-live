'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { CountUp } from './CountUp';

// The Index gauge from the pitch walkthrough: a 270° ring that opens at the
// bottom, filled with the sap-to-canopy gradient, the score inside. The ring
// fills when it scrolls into view, in step with the count-up.
const R = 66;
const C = 2 * Math.PI * R; // ~414.7
const ARC = C * 0.75; // the visible 270°
const OUT = [0.16, 1, 0.3, 1] as const;

export function Gauge({ value, from = 0, size = 168 }: { value: number | null; from?: number; size?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const v = Math.max(0, Math.min(100, value ?? 0));
  const target = (ARC * v) / 100;
  const start = (ARC * Math.max(0, Math.min(100, from))) / 100;
  const shown = reduce || inView ? target : start;
  return (
    <div ref={ref} style={{ position: 'relative', width: size, height: size, flex: 'none' }} role="img" aria-label={value == null ? 'SycaMore Index not scored yet' : `SycaMore Index ${value} of 100`}>
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
            initial={{ strokeDasharray: `${start} ${C}` }}
            animate={{ strokeDasharray: `${shown} ${C}` }}
            transition={reduce ? { duration: 0 } : { duration: 1.6, ease: OUT }}
          />
        )}
      </svg>
      <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
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

// Input bars under the gauge: each fills in turn once on screen. Decorative:
// the score is printed next to it.
export function GrowBar({ value, index = 0 }: { value: number | null; index?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  return (
    <div className="bar" ref={ref} aria-hidden>
      <motion.span
        style={{ width: `${value ?? 0}%`, transformOrigin: 'left' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: reduce || inView ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 1.2, delay: 0.15 + index * 0.16, ease: OUT }}
      />
    </div>
  );
}
