'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import s from './product.module.css';

// Wraps the hero's product visual. On a fine pointer it leans a few degrees
// toward the cursor and moves a soft spotlight across the window (spotlight.md),
// both through custom properties, so nothing re-renders as the mouse moves.
// Touch screens and reduced motion get the drawing at rest.

export function HeroStage({ children, max = 4 }: { children: ReactNode; max?: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const win = node.querySelector<HTMLElement>('[role="img"]');
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = node.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        node.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
        node.style.setProperty('--rx', `${(-y * max * 0.6).toFixed(2)}deg`);
        if (win) {
          const w = win.getBoundingClientRect();
          win.style.setProperty('--mx', `${e.clientX - w.left}px`);
          win.style.setProperty('--my', `${e.clientY - w.top}px`);
        }
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      node.style.setProperty('--ry', '0deg');
      node.style.setProperty('--rx', '0deg');
      win?.style.setProperty('--mx', '-999px');
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
    };
  }, [max]);

  return (
    <div ref={el} className={s.tilt}>
      {children}
    </div>
  );
}
