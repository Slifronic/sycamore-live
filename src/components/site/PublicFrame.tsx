import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { ThemePicker } from './ThemePicker';
import s from './public-frame.module.css';

// The thin frame around pages anyone can open from a shared link: an event
// page (/e), a published story (/c) and the not-found page. A brand bar that
// says where you are, the page, and a one-line footer with the legal links.
// No site navigation: these pages belong to the organization that shared them.
// Light and quiet: a glass bar over a faint morning mist, Lexend for the
// frame's own words, and the palette picker in the footer.

// `width` lines the bar and footer up with a narrower page column (/w is 440px).
export function PublicFrame({ children, note = 'Hours recorded with SycaMore Live.', width }: { children: ReactNode; note?: string; width?: number }) {
  return (
    <div className={s.frame} style={width ? ({ '--frame-w': `${width}px` } as CSSProperties) : undefined}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className={s.bar}>
        <Link href="/" className={s.brand}>
          <BrandMark size={20} />
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
          <span className={s.theme}>
            <span className={s.themeLabel} aria-hidden="true">
              Theme
            </span>
            <ThemePicker compact />
          </span>
        </nav>
      </footer>
    </div>
  );
}
