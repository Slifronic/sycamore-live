'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

// The phone bar's title. Home shows the greeting. Every other page has its
// own h1, so the bar works like an iOS large title: empty while the page's h1
// is on screen, then the h1's text fades into the bar once it scrolls under
// it. No page says "Discover" right above "Find your next event". The static
// names below are only the fallback for a screen with no h1 (a loading state).
function barTitle(p: string): string | null {
  if (p === '/me') return null;
  if (p.startsWith('/me/records')) return 'Record';
  if (p.startsWith('/me/badges')) return 'Badges';
  if (p.startsWith('/me/journey')) return 'Journey';
  if (p.startsWith('/me/account')) return 'Account';
  if (p.startsWith('/me/messages')) return 'Messages';
  if (p.startsWith('/checkin')) return 'Check in';
  if (p.startsWith('/discover/profile')) return 'Your experience';
  if (p.startsWith('/discover')) return 'Discover';
  return null;
}

type Collapse = { path: string; text: string; show: boolean };

/** Watches the page's first h1 under the top bar (re-finding it as the route
 *  streams in) and reports whether it has scrolled up under the bar. */
function useLargeTitle(path: string, fallback: string | null): Collapse {
  const [st, setSt] = useState<Collapse>({ path: '', text: '', show: false });
  useEffect(() => {
    if (!fallback) return;
    const main = document.getElementById('main');
    if (!main) return;
    let io: IntersectionObserver | null = null;
    let watched: Element | null = null;
    const attach = () => {
      const h1 = main.querySelector('h1');
      if (!h1) {
        if (watched !== main) {
          watched = main;
          io?.disconnect();
          setSt({ path, text: fallback, show: true });
        }
        return;
      }
      if (h1 === watched) return;
      watched = h1;
      io?.disconnect();
      const barBottom = Math.round(document.querySelector('[data-voltop]')?.getBoundingClientRect().bottom ?? 60);
      io = new IntersectionObserver(([e]) => setSt({ path, text: (h1.textContent ?? '').trim() || fallback, show: !e.isIntersecting && e.boundingClientRect.top < barBottom }), {
        rootMargin: `-${barBottom}px 0px 0px 0px`,
      });
      io.observe(h1);
    };
    const raf = requestAnimationFrame(attach);
    const mo = new MutationObserver(attach);
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io?.disconnect();
    };
  }, [path, fallback]);
  return st.path === path ? st : { path, text: fallback ?? '', show: false };
}

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
  const fallback = barTitle(path);
  const large = useLargeTitle(path, fallback);
  return (
    <header className={`${s.top} no-print`} data-voltop>
      <Link href="/me" className={s.brand} aria-label="SycaMore Live, home">
        <Leaf size={22} color="var(--canopy)" />
        <span className={s.brandText}>SycaMore</span>
      </Link>
      {fallback ? (
        // The page's own h1 carries the name for screen readers.
        <p className={s.barTitle} data-show={large.show || undefined} aria-hidden>
          {large.text}
        </p>
      ) : (
        <p className={s.hello}>
          <span className={s.helloGreet}>{greeting},</span> <span className={s.helloName}>{first}</span>
        </p>
      )}
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
        {/* Secondary on purpose: the page's own action is the one ink button. */}
        <Link href="/checkin" className={`btn btn-sm ${s.checkin}`} aria-current={path.startsWith('/checkin') ? 'page' : undefined}>
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
