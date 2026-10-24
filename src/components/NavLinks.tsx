'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import s from './nav.module.css';

// Four primary items keep the demo focused; the rest sits under "More".
// Desktop: More expands in place in the sidebar (already open on its pages).
// Phones: the four tabs scroll sideways and More opens a small menu that sits
// outside the scrolling strip, so it isn't clipped. Event story is reached
// from each event's page, not from here.

type Item = { href: string; label: string; exact?: boolean };

const PRIMARY: Item[] = [
  { href: '/org', label: 'Home', exact: true },
  { href: '/org/events', label: 'Events' },
  { href: '/org/volunteers', label: 'Volunteers' },
  { href: '/org/reports', label: 'Funder report' },
];

const MORE: Item[] = [
  { href: '/org/messages', label: 'Messages' },
  { href: '/org/badges', label: 'Badges' },
  { href: '/org/learn', label: 'Learn' },
];

const COUNT_LABEL: Record<string, [string, string]> = {
  '/org/events': ['Events waiting for you to verify', 'waiting to verify'],
  '/org/badges': ['Badges ready for your sign-off', 'ready to sign'],
  '/org/messages': ['Unread replies from volunteers', 'unread'],
};

const isActive = (path: string, it: Item) => (it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`));

const WIDE = '(min-width: 861px)';
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function NavLinks({ awaiting, badgeReady, unread = 0 }: { awaiting: number; badgeReady: number; unread?: number }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  const strip = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
  const moreActive = MORE.some((it) => isActive(path, it));
  // null = the default (open on desktop when you're on a More page, closed on phones);
  // a tap overrides it until the next navigation.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setToggled(null);
  }
  const open = toggled ?? (wide && moreActive);
  const count = (href: string) => (href === '/org/events' ? awaiting : href === '/org/badges' ? badgeReady : href === '/org/messages' ? unread : 0);
  const moreCount = MORE.reduce((n, it) => n + count(it.href), 0);

  // Phones: the tabs scroll sideways, so bring the current one into view.
  useEffect(() => {
    const el = strip.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [path]);

  // Phones: close the menu on Escape or a tap outside it.
  useEffect(() => {
    if (!open || wide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToggled(false);
    };
    const onDown = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setToggled(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, wide]);

  const link = (it: Item) => {
    const active = isActive(path, it);
    const n = count(it.href);
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
        {n > 0 && (
          <span className={s.count} title={COUNT_LABEL[it.href]?.[0]}>
            {n}
            <span className="sr-only"> {COUNT_LABEL[it.href]?.[1]}</span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className={s.nav} aria-label="Organization">
      <div ref={strip} className={s.primary}>
        {PRIMARY.map(link)}
      </div>
      <div ref={moreRef} className={s.more}>
        <button
          type="button"
          className={`${s.link} ${s.moreBtn} ${moreActive && !open ? s.moreBtnOn : ''}`}
          aria-expanded={open}
          aria-controls="nav-more"
          onClick={() => setToggled(!open)}
        >
          <span className={s.text}>More</span>
          <span className={s.moreRight}>
            {moreCount > 0 && !open && (
              <span className={s.count}>
                {moreCount}
                <span className="sr-only"> waiting under More</span>
              </span>
            )}
            <span className={`${s.chev} ${open ? s.chevOpen : ''}`} aria-hidden>
              ▾
            </span>
          </span>
        </button>
        <div id="nav-more" className={s.menu} hidden={!open}>
          {MORE.map(link)}
        </div>
      </div>
    </nav>
  );
}
