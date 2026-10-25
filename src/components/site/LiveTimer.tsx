'use client';

import { useEffect, useState } from 'react';

// A check-in timer for the drawn product mocks. The server HTML shows the
// starting time; the browser ticks it once a second. Reduced motion keeps it
// still. Decorative: the mock around it carries the accessible description.

const fmt = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export function LiveTimer({ startOffset }: { startOffset: number }) {
  const [t, setT] = useState(startOffset);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setT((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="num">{fmt(t)}</span>;
}
