'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { INSTANT, SPRING } from './motion/tokens';

/**
 * A few link choices in one track; the paper pill slides to the chosen one
 * (spring 380/32). Use it for sub-views and ranges ("30 days / 90 days"), at
 * most one per page header. `id` must be unique on the page: it names the
 * pill so it can slide between items, including across navigations.
 *
 *   <Segmented id="range" label="Range" items={[{ href: '?r=30', label: '30 days', on: r === 30 }, …]} />
 *
 * Variants: `vertical` stacks items; className "seg-tiles" makes tall tiles;
 * size="sm" is the 30px top-bar size.
 */
export function Segmented({
  id,
  label,
  items,
  vertical = false,
  size = 'md',
  className = '',
}: {
  id: string;
  label: string;
  items: { href: string; label: React.ReactNode; on: boolean }[];
  vertical?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const reduce = useReducedMotion();
  const track = useRef<HTMLElement>(null);
  // A track wider than its space scrolls sideways; a 24px fade marks whichever
  // edge has more, and the chosen item starts in view.
  useEffect(() => {
    const el = track.current;
    if (!el || vertical) return;
    const on = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (on && (on.offsetLeft + on.offsetWidth > el.scrollLeft + el.clientWidth || on.offsetLeft < el.scrollLeft)) el.scrollLeft = on.offsetLeft - 24;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const fade = [el.scrollLeft > 1 && 'start', el.scrollLeft < max - 1 && 'end'].filter(Boolean).join(' ');
      if (fade) el.setAttribute('data-fade', fade);
      else el.removeAttribute('data-fade');
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [vertical, items.length]);
  return (
    <nav ref={track} className={`seg ${vertical ? 'seg-col' : ''} ${size === 'sm' ? 'seg-sm' : ''} ${className}`} aria-label={label}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="seg-item" aria-current={it.on ? 'page' : undefined} scroll={false}>
          {it.on && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={reduce ? INSTANT : SPRING} aria-hidden />}
          <span className="seg-text">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
