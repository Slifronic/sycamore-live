'use client';

import Link from 'next/link';
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
  return (
    <nav className={`seg ${vertical ? 'seg-col' : ''} ${size === 'sm' ? 'seg-sm' : ''} ${className}`} aria-label={label}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="seg-item" aria-current={it.on ? 'page' : undefined} scroll={false}>
          {it.on && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={reduce ? INSTANT : SPRING} aria-hidden />}
          <span className="seg-text">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
