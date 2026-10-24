'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

// A number that changes while you watch (a live headcount): the first render is
// the true value with no animation; each later change rolls from the old value
// to the new one in about 0.4s. Screen readers get the true value once.
export function LiveNumber({ value, duration = 0.45 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    const el = ref.current;
    if (!el || from === value) return;
    if (reduce) {
      el.textContent = String(value);
      return;
    }
    el.animate?.([{ transform: 'translateY(-14%) scale(1.06)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    const c = animate(from, value, { duration, ease: [0.33, 1, 0.68, 1], onUpdate: (n) => (el.textContent = String(Math.round(n))) });
    return () => c.stop();
  }, [value, reduce, duration]);

  return (
    <span className="num" style={{ display: 'inline-block' }}>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden style={{ display: 'inline-block' }}>
        {value}
      </span>
    </span>
  );
}
