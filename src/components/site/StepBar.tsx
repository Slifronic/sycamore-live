'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import s from './stepbar.module.css';

// A sticky "where am I" bar for pages that are a sequence. Plain anchor links,
// so it works with no JavaScript; the script adds the current step (a pill
// that glides with the header's spring), a progress rule that grows with
// transform only, and keeps the current chip in view on narrow screens.

export type Step = { id: string; label: string };

export function StepBar({ steps, label, children }: { steps: Step[]; label: string; children: ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  const row = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const els = steps.map((st) => document.getElementById(st.id)).filter((x): x is HTMLElement => !!x);
    if (!els.length) return;
    let raf = 0;
    const pick = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.35;
        let cur: string | null = null;
        for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
        const last = els[els.length - 1].getBoundingClientRect();
        if (last.bottom < line * 0.5) cur = null;
        setActive(cur);
      });
    };
    pick();
    window.addEventListener('scroll', pick, { passive: true });
    window.addEventListener('resize', pick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', pick);
      window.removeEventListener('resize', pick);
    };
  }, [steps]);

  // Keep the current chip visible inside the bar (horizontal scroll only).
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    if (!active) {
      el.scrollTo({ left: 0 });
      return;
    }
    const chip = el.querySelector<HTMLElement>(`[data-step="${active}"]`);
    if (!chip) return;
    const left = el.scrollLeft + chip.getBoundingClientRect().left - el.getBoundingClientRect().left - (el.clientWidth - chip.offsetWidth) / 2;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
  }, [active]);

  const idx = active ? steps.findIndex((st) => st.id === active) : -1;

  return (
    <div className={s.scope}>
      <nav className={s.bar} aria-label={label}>
        <div className={s.inner}>
          <ol ref={row} className={s.row}>
            {steps.map((st, i) => {
              const on = st.id === active;
              return (
                <li key={st.id}>
                  <a href={`#${st.id}`} className={s.chip} data-step={st.id} aria-current={on ? 'step' : undefined}>
                    {on && <motion.span layoutId={`stepbar-${label}`} className={s.pill} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <span className={s.n}>{i + 1}</span>
                    <span className={s.t}>{st.label}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
        <span className={s.rule} aria-hidden="true">
          <i style={{ transform: `scaleX(${(idx + 1) / steps.length})` }} />
        </span>
      </nav>
      {children}
    </div>
  );
}
