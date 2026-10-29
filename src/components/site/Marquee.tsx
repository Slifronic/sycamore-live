'use client';

import { useState } from 'react';
import s from './ambient.module.css';

// Port of the library's text-marquee.md: the items twice, sliding exactly
// -50%, spacing inside each item so the loop has no seam. Screen readers get
// the list once; the moving copy is aria-hidden. A pause button covers
// WCAG 2.2.2, and reduced motion turns it into a static, wrapped line.

export function Marquee({ items, label }: { items: string[]; label: string }) {
  const [paused, setPaused] = useState(false);
  // One copy must be wider than the widest screen, so repeat short lists.
  const copy = items.length < 8 ? [...items, ...items] : items;
  return (
    <div className={`${s.marquee} ${paused ? s.paused : ''}`}>
      <ul className="sr-only" aria-label={label}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div className={s.mask} aria-hidden="true">
        <div className={s.track}>
          {copy.map((t, i) => (
            <span key={`a${i}`} data-dup={i >= items.length ? '' : undefined}>
              {t}
            </span>
          ))}
          {copy.map((t, i) => (
            <span key={`b${i}`} data-dup="">
              {t}
            </span>
          ))}
        </div>
      </div>
      <button type="button" className={s.pause} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
        <span className="sr-only">Pause the moving list</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {paused ? <path d="M5 3.5v9l7-4.5z" /> : <path d="M5 3.5h2v9H5zM9 3.5h2v9H9z" />}
        </svg>
      </button>
    </div>
  );
}
