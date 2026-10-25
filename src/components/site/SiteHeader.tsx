'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrandMark } from './BrandMark';
import { MORE, NAV, activeHref } from './nav';
import s from './header.module.css';

// Sticky translucent header. The hover pill is a port of glass-dock's idea:
// one shared pill glides (spring 380/32, the app's nav pill values) to
// whichever link the pointer or keyboard is on, and rests on the current page.
// Phones get a sheet that drops from the top with a focus trap and Escape.

const ALL = [...NAV, ...MORE].map((l) => l.href);

export function SiteHeader() {
  const path = usePathname() ?? '/';
  const active = activeHref(path, ALL);
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const pill = hover ?? active ?? null;

  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);

  // A link inside the sheet was followed: close without stealing focus. (The
  // links also close it on click, since Next keeps a left page's state.)
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    const first = sheet.current?.querySelector<HTMLElement>('a, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !sheet.current) return;
      const items = Array.from(sheet.current.querySelectorAll<HTMLElement>('a, button'));
      const all = [button.current!, ...items];
      const i = all.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        all[all.length - 1].focus();
      } else if (!e.shiftKey && i === all.length - 1) {
        e.preventDefault();
        all[0].focus();
      }
    };
    const onResize = () => window.innerWidth >= 1080 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      root.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  return (
    <header className={s.header} data-open={open || undefined}>
      <div className={s.bar}>
        <Link href="/" className={s.brand} aria-current={path === '/' ? 'page' : undefined}>
          <BrandMark />
        </Link>

        <nav aria-label="Main" className={s.nav} onMouseLeave={() => setHover(null)}>
          <ul>
            {NAV.map((l) => {
              const current = active === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={s.link}
                    aria-current={current ? 'page' : undefined}
                    onMouseEnter={() => setHover(l.href)}
                    onFocus={() => setHover(l.href)}
                    onBlur={() => setHover(null)}
                  >
                    {pill === l.href && (
                      <motion.span
                        layoutId="site-nav-pill"
                        className={`${s.pill} ${current ? s.pillCurrent : ''}`}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className={s.linkText}>{l.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={s.actions}>
          <Link href="/org/login" className={s.signin}>
            Sign in
          </Link>
          <Link href="/org/start" className={`btn btn-primary ${s.cta}`}>
            Get started
          </Link>
          <button
            ref={button}
            type="button"
            className={s.menuBtn}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <span className={s.burger} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className={s.scrim}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              aria-hidden="true"
            />
            <motion.div
              key="sheet"
              id="site-menu"
              ref={sheet}
              className={s.sheet}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              initial={{ opacity: 0, y: -18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            >
              <nav aria-label="Site">
                <ul className={s.sheetList}>
                  {[...NAV, ...MORE].map((l, i) => (
                    <motion.li
                      key={l.href}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 + i * 0.035, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link href={l.href} className={s.sheetLink} aria-current={active === l.href ? 'page' : undefined} onClick={() => setOpen(false)}>
                        {l.label}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>
              <div className={s.sheetActions}>
                <Link href="/org/start" className="btn btn-primary btn-big" onClick={() => setOpen(false)}>
                  Set up your organization
                </Link>
                <Link href="/join" className="btn btn-big" onClick={() => setOpen(false)}>
                  I’m volunteering
                </Link>
                <Link href="/org/login" className={s.sheetSignin} onClick={() => setOpen(false)}>
                  Coordinator sign in
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
