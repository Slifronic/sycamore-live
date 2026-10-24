'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// The hero record card leans toward the pointer. It writes two custom
// properties on the card (no React state per move); the CSS turns them into a
// small 3D rotation. Touch screens and reduced motion get the card at rest.

export function Tilt({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    const scope = node?.closest<HTMLElement>('[data-tilt-scope]') ?? node?.parentElement;
    if (!node || !scope) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = scope.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        node.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
        node.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      node.style.setProperty('--ry', '0deg');
      node.style.setProperty('--rx', '0deg');
    };
    scope.addEventListener('pointermove', move);
    scope.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      scope.removeEventListener('pointermove', move);
      scope.removeEventListener('pointerleave', leave);
    };
  }, [max]);

  return (
    <div ref={el} className={className}>
      {children}
    </div>
  );
}
