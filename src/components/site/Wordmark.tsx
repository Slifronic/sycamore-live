'use client';

import { useEffect, useRef } from 'react';
import s from './footer.module.css';

// Port of animated-footer's display heading: the letters of "SycaMore" rise
// out of a mask one after another as the footer scrolls in. Server HTML is the
// finished wordmark; JavaScript only hides the letters when the footer is
// still below the fold, and never under reduced motion.

const WORD = 'SycaMore';

export function Wordmark() {
  const el = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    node.dataset.armed = '';
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        node.dataset.in = '';
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <p ref={el} className={s.wordmark} aria-label={WORD}>
      {Array.from(WORD).map((ch, i) => (
        <span key={i} className={s.char} aria-hidden="true" style={{ ['--i' as string]: i }}>
          {ch}
        </span>
      ))}
    </p>
  );
}
