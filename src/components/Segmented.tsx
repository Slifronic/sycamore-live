'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

// A few link choices in one track; the white pill slides to the chosen one.
export function Segmented({ id, label, items, vertical = false, className = '' }: { id: string; label: string; items: { href: string; label: React.ReactNode; on: boolean }[]; vertical?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <nav className={`seg ${vertical ? 'seg-col' : ''} ${className}`} aria-label={label}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="seg-item" aria-current={it.on ? 'page' : undefined} scroll={false}>
          {it.on && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }} aria-hidden />}
          <span className="seg-text">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
