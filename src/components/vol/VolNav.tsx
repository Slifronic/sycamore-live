'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import nav from '../nav.module.css';
import s from './volnav.module.css';

// The volunteer shell's navigation: the org sidebar's look on desktop, a
// bottom tab bar on phones (My journey lives under Badges there).

type Item = { href: string; label: string; icon: keyof typeof ICONS; match: (p: string) => boolean };

const ITEMS: Item[] = [
  { href: '/me', label: 'My hours', icon: 'home', match: (p) => p === '/me' || p.startsWith('/me/records') },
  { href: '/checkin', label: 'Check in', icon: 'scan', match: (p) => p.startsWith('/checkin') },
  { href: '/me/messages', label: 'Messages', icon: 'chat', match: (p) => p.startsWith('/me/messages') },
];

const GROWTH: Item[] = [
  { href: '/me/badges', label: 'Badges', icon: 'badge', match: (p) => p.startsWith('/me/badges') },
  { href: '/me/journey', label: 'My journey', icon: 'path', match: (p) => p.startsWith('/me/journey') },
  { href: '/discover', label: 'Discover', icon: 'compass', match: (p) => p.startsWith('/discover') },
];

// Phones: five tabs, thumb-reachable. Journey is a link from Badges and My hours.
const TABS: Item[] = [ITEMS[0], ITEMS[1], GROWTH[2], { ...GROWTH[0], match: (p) => p.startsWith('/me/badges') || p.startsWith('/me/journey') }, ITEMS[2]];

const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  scan: <path d="M8 3H4v4m12-4h4v4M4 17v4h4m12-4v4h-4M7 12h10" />,
  chat: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  badge: <path d="m12 3 7.5 4.3v8.4L12 20l-7.5-4.3V7.3zm-3 8.5 2 2 4-4" />,
  path: <path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />,
  compass: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5z" />,
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
  const link = (it: Item) => {
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
  };
  return (
    <nav className={`${nav.nav} ${s.side}`} aria-label="Volunteer">
      <div className={nav.group}>
        <p className={nav.groupLabel}>Your service</p>
        {ITEMS.map(link)}
      </div>
      <div className={nav.group}>
        <p className={nav.groupLabel}>Your growth</p>
        {GROWTH.map(link)}
      </div>
    </nav>
  );
}

export function VolTabBar({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className={`${s.tabs} no-print`} aria-label="Volunteer">
      {TABS.map((it) => {
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
