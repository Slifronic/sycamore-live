'use client';

import { motion, useReducedMotion } from 'motion/react';

// A small trend line that draws itself in once. Decorative: the number next to
// it carries the meaning, so it's hidden from screen readers.
export function Sparkline({ points, width = 96, height = 32, color = 'currentColor', delay = 0 }: { points: number[]; width?: number; height?: number; color?: string; delay?: number }) {
  // The server can't know the motion preference, so `initial` is the same on both
  // sides (no hydration mismatch); reduced motion just makes the transition instant.
  const reduce = useReducedMotion();
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const xy = points.map((p, i) => [i * step, height - 3 - ((p - min) / span) * (height - 6)] as const);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ overflow: 'visible' }}>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.circle
        cx={lx}
        cy={ly}
        r={3}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={reduce ? { duration: 0 } : { delay: delay + 1, type: 'spring', stiffness: 380, damping: 18 }}
      />
    </svg>
  );
}
