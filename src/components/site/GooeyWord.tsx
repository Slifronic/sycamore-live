'use client';

import { useEffect, useId, useRef, useState } from 'react';
import s from './gooey.module.css';

// Port of vengeance-ui's gooey-text-reveal for one short phrase: the first word
// melts into the second through an SVG alpha-threshold ("goo") filter while
// each side blurs in or out. The server HTML shows only the final word, so
// without JavaScript or with reduced motion the sentence simply reads right.

export function GooeyWord({ from, to, delay = 1500 }: { from: string; to: string; delay?: number }) {
  const [phase, setPhase] = useState<'final' | 'from' | 'melt'>('final');
  const raw = useId();
  const filterId = `goo-${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = timers.current;
    t.push(window.setTimeout(() => setPhase('from'), 0));
    t.push(window.setTimeout(() => setPhase('melt'), delay));
    t.push(window.setTimeout(() => setPhase('final'), delay + 1300));
    return () => t.forEach(clearTimeout);
  }, [delay]);

  return (
    <span className={s.word} data-phase={phase} style={{ ['--goo' as string]: `url(#${filterId})` }}>
      <span className={s.sizer} aria-hidden="true">
        {from.length > to.length ? from : to}
      </span>
      <span className={s.from} aria-hidden="true">
        {from}
      </span>
      <span className={s.to}>{to}</span>
      <svg className={s.defs} aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" />
          </filter>
        </defs>
      </svg>
    </span>
  );
}
