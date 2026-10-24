'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef } from 'react';

// Renders the true value on the server, so nothing is ever blank or wrong
// without JavaScript. On the client it counts up from `from` the first time it
// scrolls into view. Reduced motion: the true value, no count.
export function CountUp({
  value,
  from = 0,
  duration = 0.9,
  decimals = 0,
  prefix = '',
  suffix = '',
  delay = 0,
}: {
  value: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const fmt = (n: number) =>
    prefix + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

  // Before first paint, show the starting number so there's no flash of the final
  // one. Only for numbers already on screen: anything below the fold keeps its true
  // value until it scrolls in, so print and quick scrolls never see a 0.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!reduce && el && from !== value && el.getBoundingClientRect().top < window.innerHeight) el.textContent = fmt(from);
    const onPrint = () => {
      if (ref.current) ref.current.textContent = fmt(value);
    };
    window.addEventListener('beforeprint', onPrint);
    return () => window.removeEventListener('beforeprint', onPrint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce || from === value) {
      ref.current.textContent = fmt(value);
      return;
    }
    const controls = animate(from, value, {
      duration,
      delay,
      ease: [0.33, 1, 0.68, 1], // easeOutCubic
      onUpdate: (n) => {
        if (ref.current) ref.current.textContent = fmt(n);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value]);

  // Screen readers get the true value once; the moving digits are hidden from them.
  return (
    <span className="num">
      <span className="sr-only">{fmt(value)}</span>
      <span ref={ref} aria-hidden>
        {fmt(value)}
      </span>
    </span>
  );
}
