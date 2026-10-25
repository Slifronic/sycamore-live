'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useSyncExternalStore, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Icon } from './shell/icons';
import { MORE, RAIL, TABS, TAB_MORE, isActive, type NavItem } from './shell/org-nav';
import { ThemeToggle } from './shell/ThemeToggle';
import { currentTheme, subscribeTheme, toggleTheme } from './shell/theme';
import { Tooltip } from './ui/Tooltip';
import { Menu, type MenuItem } from './ui/Popover';
import { INSTANT, SPRING } from './motion/tokens';
import s from './shell/rail.module.css';

// The coordinator's navigation. Desktop: a slim icon rail (the five sections,
// then More and the theme toggle at the foot; sign out lives in the account
// menu). The active
// item sits on a moss pill that slides between items (spring 380/32).
// Keyboard: Tab reaches the rail; ↑/↓ (and Home/End) move within it.
// Phones: a bottom tab bar of four sections plus More.

export type NavCounts = { awaiting: number; unread: number; badges: number };
export type Course = { done: number; total: number; complete: boolean };

const COUNT_TEXT: Record<NonNullable<NavItem['count']>, string> = {
  awaiting: 'waiting to verify',
  unread: 'unread',
  badges: 'ready to sign',
};
const countOf = (it: NavItem, c: NavCounts) => (it.count ? c[it.count] : 0);
const toneOf = (it: NavItem) => (it.count === 'unread' ? 'red' : 'amber');

function moreItems(path: string, counts: NavCounts, course: Course, list: NavItem[]): MenuItem[] {
  return list.map((it) => ({
    href: it.href,
    label: it.label,
    icon: it.icon,
    current: isActive(path, it),
    hint: it.href === '/org/learn' && !course.complete ? `${course.done} of ${course.total} lessons done` : undefined,
    meta: countOf(it, counts) > 0 ? countOf(it, counts) : undefined,
  }));
}

export function OrgRail({ counts, course }: { counts: NavCounts; course: Course; signOut?: () => Promise<void> }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  const nav = useRef<HTMLElement>(null);
  const moreActive = MORE.some((it) => isActive(path, it));
  const moreCount = MORE.reduce((n, it) => n + countOf(it, counts), 0);

  const onKey = (e: KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    if ((e.target as HTMLElement).closest('[role="menu"]')) return;
    const els = Array.from(nav.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []).filter((el) => !el.closest('[role="menu"]'));
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length;
    els[n]?.focus();
  };

  const pill = <motion.span layoutId="rail-pill" className={s.pill} transition={reduce ? INSTANT : SPRING} aria-hidden />;

  return (
    <nav ref={nav} className={`${s.rail} no-print`} aria-label="Organization" onKeyDown={onKey}>
      <ul className={s.group}>
        {RAIL.map((it) => {
          const active = isActive(path, it);
          const n = countOf(it, counts);
          return (
            <li key={it.href}>
              <Tooltip label={it.label} side="right">
                <Link href={it.href} className={s.item} aria-label={n > 0 ? `${it.label}, ${n} ${COUNT_TEXT[it.count!]}` : it.label} aria-current={active ? 'page' : undefined}>
                  {active && pill}
                  <Icon name={it.icon} size={20} className={s.icon} />
                  {n > 0 && (
                    <span className={s.count} data-tone={toneOf(it)} aria-hidden>
                      {n > 99 ? '99+' : n}
                    </span>
                  )}
                </Link>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      <div className={`${s.group} ${s.foot}`}>
        <Menu
          label="More pages"
          placement="right-end"
          items={moreItems(path, counts, course, MORE)}
          trigger={(p) => (
            <Tooltip label="More" side="right">
              <button {...p} type="button" className={s.item} aria-label={moreCount > 0 ? `More, ${moreCount} waiting` : 'More'} data-on={moreActive || undefined}>
                {moreActive && pill}
                <Icon name="grid" size={20} className={s.icon} />
                {moreCount > 0 && (
                  <span className={s.count} data-tone="amber" aria-hidden>
                    {moreCount}
                  </span>
                )}
              </button>
            </Tooltip>
          )}
        />
        <span className={s.rule} aria-hidden />
        <ThemeToggle tooltip="right" className={s.item} />
      </div>
    </nav>
  );
}

export function OrgTabBar({ counts, course, signOut }: { counts: NavCounts; course: Course; signOut: () => Promise<void> }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  const form = useRef<HTMLFormElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => 'light' as const);
  const moreActive = TAB_MORE.some((it) => isActive(path, it));
  const moreCount = TAB_MORE.reduce((n, it) => n + countOf(it, counts), 0);
  const pill = <motion.span layoutId="tab-pill" className={s.tabPill} transition={reduce ? INSTANT : SPRING} aria-hidden />;

  return (
    <nav className={`${s.tabs} no-print`} aria-label="Organization" data-tabbar>
      {TABS.map((it) => {
        const active = isActive(path, it);
        const n = countOf(it, counts);
        return (
          <Link key={it.href} href={it.href} className={s.tab} aria-current={active ? 'page' : undefined}>
            {active && pill}
            <span className={s.tabIcon}>
              <Icon name={it.icon} size={20} />
              {n > 0 && (
                <span className={s.tabCount} data-tone={toneOf(it)}>
                  {n}
                  <span className="sr-only"> {COUNT_TEXT[it.count!]}</span>
                </span>
              )}
            </span>
            <span className={s.tabLabel}>{it.label}</span>
          </Link>
        );
      })}
      <Menu
        label="More"
        placement="top-end"
        className={s.tabMore}
        items={[
          ...moreItems(path, counts, course, TAB_MORE),
          'separator',
          { label: theme === 'dark' ? 'Light theme' : 'Dark theme', icon: theme === 'dark' ? 'sun' : 'moon', onSelect: () => toggleTheme(document.activeElement) },
          { label: 'Sign out', icon: 'logout', onSelect: () => form.current?.requestSubmit() },
        ]}
        trigger={(p) => (
          <button {...p} type="button" className={s.tab} data-on={moreActive || undefined}>
            {moreActive && pill}
            <span className={s.tabIcon}>
              <Icon name="grid" size={20} />
              {moreCount > 0 && (
                <span className={s.tabCount} data-tone="amber">
                  {moreCount}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </span>
            <span className={s.tabLabel}>More</span>
          </button>
        )}
      />
      <form ref={form} action={signOut} hidden />
    </nav>
  );
}
