'use client';

import { useEffect, useId, useRef, useState } from 'react';
import s from './motion.module.css';

/**
 * A small trend line that draws itself in once, the first time it is on
 * screen. Decorative: the number beside it carries the meaning, so it's
 * hidden from screen readers.
 *
 * Visible without JavaScript: the "hidden until drawn" state only applies
 * under `@media (scripting: enabled)`, and reduced motion skips the draw.
 * `area` adds a soft gradient fill under the line (stat cards).
 *
 *   <Sparkline points={[3, 5, 4, 8, 12]} width={96} height={32} area />
 */
export function Sparkline({
  points,
  width = 96,
  height = 32,
  color = 'currentColor',
  delay = 0,
  area = false,
  strokeWidth = 2,
  className = '',
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  delay?: number;
  area?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);
  const gid = useId().replace(/:/g, '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const xy = points.map((p, i) => [i * step, height - 3 - ((p - min) / span) * (height - 6)] as const);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={`${s.spark} ${className}`}
      data-in={inView || undefined}
      style={{ overflow: 'visible', ['--spark-delay' as string]: `${delay}s` }}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={`sg${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className={s.sparkArea} d={`${d} L${width} ${height} L0 ${height} Z`} fill={`url(#sg${gid})`} />
        </>
      )}
      <path className={s.sparkLine} d={d} pathLength={1} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle className={s.sparkDot} cx={lx} cy={ly} r={3} fill={color} />
    </svg>
  );
}
