'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Icon, type IconName } from '../shell/icons';
import { Leaf } from '../media/Leaf';
import { INSTANT, SPRING } from '../motion/tokens';
import s from './volnav.module.css';

// The volunteer app's navigation: four tabs (Home, Discover, Messages, Me).
// Phones: a greeting bar on top and a bottom tab bar with big thumb targets.
// Desktop: one sticky top bar with the brand, the same four tabs as a pill
// switcher, Check in, and the avatar. Check in, Badges and My journey stay
// one tap away (the Check in button, and the Me tab).

type Tab = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

export const VOL_TABS: Tab[] = [
  { href: '/me', label: 'Home', icon: 'home', match: (p) => p === '/me' || p.startsWith('/me/records') || p.startsWith('/checkin') },
  { href: '/discover', label: 'Discover', icon: 'compass', match: (p) => p.startsWith('/discover') },
  { href: '/me/messages', label: 'Messages', icon: 'message', match: (p) => p.startsWith('/me/messages') },
  { href: '/me/account', label: 'Me', icon: 'user', match: (p) => p.startsWith('/me/account') || p.startsWith('/me/badges') || p.startsWith('/me/journey') },
];

function Count({ n, className }: { n: number; className: string }) {
  if (n <= 0) return null;
  return (
    <span className={className}>
      {n > 99 ? '99+' : n}
      <span className="sr-only"> unread</span>
    </span>
  );
}

export function VolTopBar({ greeting, first, initials, unread }: { greeting: string; first: string; initials: string; unread: number }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  const meActive = VOL_TABS[3].match(path);
  return (
    <header className={`${s.top} no-print`}>
      <Link href="/me" className={s.brand} aria-label="SycaMore, home">
        <Leaf size={22} color="var(--canopy)" />
        <span className={s.brandText}>SycaMore</span>
      </Link>
      <p className={s.hello}>
        <span className={s.helloGreet}>{greeting},</span> <span className={s.helloName}>{first}</span>
      </p>
      <nav className={s.pills} aria-label="Volunteer">
        {VOL_TABS.map((t) => {
          const on = t.match(path);
          return (
            <Link key={t.href} href={t.href} className={s.pillItem} aria-current={on ? 'page' : undefined}>
              {on && <motion.span layoutId="vol-top-pill" className={s.pill} transition={reduce ? INSTANT : SPRING} aria-hidden />}
              <Icon name={t.icon} size={16} className={s.pillIcon} />
              <span className={s.pillText}>{t.label}</span>
              {t.href === '/me/messages' && <Count n={unread} className={s.pillCount} />}
            </Link>
          );
        })}
      </nav>
      <div className={s.actions}>
        <Link href="/checkin" className={`btn btn-primary btn-sm ${s.checkin}`}>
          <Icon name="scan" size={16} />
          <span className={s.checkinText}>Check in</span>
        </Link>
        <Link href="/me/account" className={s.avatar} aria-label="Your account" aria-current={meActive ? 'page' : undefined}>
          {initials}
        </Link>
      </div>
    </header>
  );
}

export function VolTabBar({ unread }: { unread: number }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav className={`${s.tabs} no-print`} aria-label="Volunteer" data-tabbar>
      {VOL_TABS.map((t) => {
        const on = t.match(path);
        return (
          <Link key={t.href} href={t.href} className={s.tab} aria-current={on ? 'page' : undefined}>
            {on && <motion.span layoutId="vol-tab-pill" className={s.tabPill} transition={reduce ? INSTANT : SPRING} aria-hidden />}
            <span className={s.tabIcon}>
              <Icon name={t.icon} size={22} />
              {t.href === '/me/messages' && <Count n={unread} className={s.tabCount} />}
            </span>
            <span className={s.tabLabel}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
