import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import s from './site.module.css';

/** Skip link, sticky header, the page, the footer: every marketing page. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className={s.main}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
