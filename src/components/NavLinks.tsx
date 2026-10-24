'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COURSE_MINUTES } from '@/lib/course';
import s from './nav.module.css';

const ITEMS = [
  { href: '/org', label: 'Home', exact: true },
  { href: '/org/events', label: 'Events' },
  { href: '/org/volunteers', label: 'Volunteers' },
  { href: '/org/score', label: 'SycaMore Index' },
  { href: '/org/badges', label: 'Badges' },
  { href: '/org/reports', label: 'Funder report' },
  { href: '/org/learn', label: `Learn in ${COURSE_MINUTES} minutes` },
];

export function NavLinks({ awaiting, badgeReady }: { awaiting: number; badgeReady: number }) {
  const path = usePathname();
  return (
    <nav className={s.nav} aria-label="Organization">
      {ITEMS.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        const count = it.href === '/org/events' ? awaiting : it.href === '/org/badges' ? badgeReady : 0;
        return (
          <Link key={it.href} href={it.href} className={`${s.link} ${active ? s.active : ''}`} aria-current={active ? 'page' : undefined}>
            <span>{it.label}</span>
            {count > 0 && (
              <span className={s.count} title={it.href === '/org/events' ? 'Events waiting for you to verify' : 'Badges ready for your sign-off'}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
