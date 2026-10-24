'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import nav from '../nav.module.css';
import s from './volnav.module.css';

// The volunteer shell's navigation: the org sidebar's look on desktop, a
// bottom tab bar on phones. "Coming next" holds the slots the next builder
// fills (badges, journey, discover); they are labels, not links, until then.

type Item = { href: string; label: string; icon: keyof typeof ICONS; match: (p: string) => boolean };

const ITEMS: Item[] = [
  { href: '/me', label: 'My hours', icon: 'home', match: (p) => p === '/me' || p.startsWith('/me/records') },
  { href: '/checkin', label: 'Check in', icon: 'scan', match: (p) => p.startsWith('/checkin') },
  { href: '/me/messages', label: 'Messages', icon: 'chat', match: (p) => p.startsWith('/me/messages') },
];

export const COMING_NEXT = ['Badges', 'My journey', 'Discover'];

const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  scan: <path d="M8 3H4v4m12-4h4v4M4 17v4h4m12-4v4h-4M7 12h10" />,
  chat: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export function VolSideNav({ unread }: { unread: number }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav className={`${nav.nav} ${s.side}`} aria-label="Volunteer">
      <div className={nav.group}>
        <p className={nav.groupLabel}>Your service</p>
        {ITEMS.map((it) => {
          const active = it.match(path);
          const count = it.href === '/me/messages' ? unread : 0;
          return (
            <Link key={it.href} href={it.href} className={`${nav.link} ${active ? nav.active : ''}`} aria-current={active ? 'page' : undefined}>
              {active && (
                <motion.span layoutId="vol-nav-pill" className={nav.pill} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }} aria-hidden />
              )}
              <span className={nav.text}>{it.label}</span>
              {count > 0 && (
                <span className={nav.count}>
                  {count}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className={nav.group}>
        <p className={nav.groupLabel}>Coming next</p>
        {COMING_NEXT.map((label) => (
          <span key={label} className={`${nav.link} ${s.soon}`} aria-disabled="true">
            <span className={nav.text}>{label}</span>
            <span className={s.soonTag}>Soon</span>
          </span>
        ))}
      </div>
    </nav>
  );
}

export function VolTabBar({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className={`${s.tabs} no-print`} aria-label="Volunteer">
      {ITEMS.map((it) => {
        const active = it.match(path);
        const count = it.href === '/me/messages' ? unread : 0;
        return (
          <Link key={it.href} href={it.href} className={s.tab} aria-current={active ? 'page' : undefined}>
            <span className={s.tabIcon}>
              <Icon name={it.icon} />
              {count > 0 && (
                <span className={s.dot}>
                  {count}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
