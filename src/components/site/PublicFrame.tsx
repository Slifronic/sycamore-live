import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '../shell/ThemeToggle';
import s from './public-frame.module.css';

// The thin frame around pages anyone can open from a shared link: an event
// page (/e), a published story (/c) and the not-found page. A brand bar that
// says where you are, the page, and a one-line footer with the legal links.
// No site navigation: these pages belong to the organization that shared them.

export function PublicFrame({ children, note = 'Hours recorded with SycaMore Live.' }: { children: ReactNode; note?: string }) {
  return (
    <div className={s.frame}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className={s.bar}>
        <Link href="/" className={s.brand}>
          <span className={s.mark} aria-hidden="true">
            ❦
          </span>
          SycaMore Live
        </Link>
        <Link href="/how-it-works" className={s.what}>
          What is this?
        </Link>
      </header>
      <main id="main" tabIndex={-1} className={s.main}>
        {children}
      </main>
      <footer className={s.foot}>
        <p>{note}</p>
        <nav aria-label="Legal" className={s.legal}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <ThemeToggle variant="inline" className={s.theme} />
        </nav>
      </footer>
    </div>
  );
}
