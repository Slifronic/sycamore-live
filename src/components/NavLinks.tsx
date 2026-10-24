'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { COURSE_MINUTES } from '@/lib/course';
import s from './nav.module.css';

const GROUPS = [
  {
    label: 'Run events',
    items: [
      { href: '/org', label: 'Home', exact: true },
      { href: '/org/events', label: 'Events' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/org/volunteers', label: 'Volunteers' },
      { href: '/org/messages', label: 'Messages' },
      { href: '/org/badges', label: 'Badges' },
    ],
  },
  {
    label: 'Proof',
    items: [
      { href: '/org/score', label: 'SycaMore Index' },
      { href: '/org/reports', label: 'Funder report' },
    ],
  },
  {
    label: 'Help',
    items: [{ href: '/org/learn', label: `Learn in ${COURSE_MINUTES} minutes` }],
  },
];

const COUNT_LABEL: Record<string, [string, string]> = {
  '/org/events': ['Events waiting for you to verify', 'waiting to verify'],
  '/org/badges': ['Badges ready for your sign-off', 'ready to sign'],
  '/org/messages': ['Unread replies from volunteers', 'unread'],
};

export function NavLinks({ awaiting, badgeReady, unread = 0 }: { awaiting: number; badgeReady: number; unread?: number }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav className={s.nav} aria-label="Organization">
      {GROUPS.map((g) => (
        <div key={g.label} className={s.group}>
          <p className={s.groupLabel}>{g.label}</p>
          {g.items.map((it) => {
            const active = it.exact ? path === it.href : path.startsWith(it.href);
            const count = it.href === '/org/events' ? awaiting : it.href === '/org/badges' ? badgeReady : it.href === '/org/messages' ? unread : 0;
            return (
              <Link key={it.href} href={it.href} className={`${s.link} ${active ? s.active : ''}`} aria-current={active ? 'page' : undefined}>
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className={s.pill}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                    aria-hidden
                  />
                )}
                <span className={s.text}>{it.label}</span>
                {count > 0 && (
                  <span className={s.count} title={COUNT_LABEL[it.href]?.[0]}>
                    {count}
                    <span className="sr-only"> {COUNT_LABEL[it.href]?.[1]}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
