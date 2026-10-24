'use client';

import { useEffect, useRef, useState } from 'react';

// Port of ticker.md: starts at the TRUE value, so the server HTML, print and a
// failed script all show the real figure. Only a number still below the fold
// is reset to zero and counted up when it scrolls in.

export function Ticker({ to, suffix = '', duration = 1100, className }: { to: number; suffix?: string; duration?: number; className?: string }) {
  const [n, setN] = useState(to);
  const el = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = el.current;
    if (!node || node.getBoundingClientRect().top < window.innerHeight) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || ran.current) return;
        ran.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
          if (t < 1) raf = requestAnimationFrame(tick);
          else setN(to);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    // Reset only once we know it's below the fold.
    raf = requestAnimationFrame(() => setN(0));
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span className={className}>
      <span className="sr-only">
        {to.toLocaleString('en-US')}
        {suffix}
      </span>
      <span ref={el} aria-hidden="true" className="num">
        {n.toLocaleString('en-US')}
        {suffix}
      </span>
    </span>
  );
}
