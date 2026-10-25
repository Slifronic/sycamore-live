import Link from 'next/link';
import { FOOTER_GROUPS } from './nav';
import { Wordmark } from './Wordmark';
import { ThemeToggle } from '../shell/ThemeToggle';
import s from './footer.module.css';

// Legal pages (created by the marketing agent, round 1). Listed here so every
// public page links to them.
const LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/data', label: 'Your data' },
  { href: '/licenses', label: 'Licenses' },
] as const;

// Port of vengeance-ui footer/five (link groups over a rule) with the
// animated-footer's oversized wordmark rising at the bottom.

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.top}>
          <div className={s.about}>
            <p className={s.brand}>
              <span aria-hidden="true">❦</span> SycaMore Live
            </p>
            <p className={s.blurb}>
              Volunteer hours recorded as the event happens, confirmed by the organization, and checkable by anyone with the link.
            </p>
            <p className={s.built}>Built at Cal Hacks 13.0 · Oct 23–25, 2026</p>
          </div>
          <nav aria-label="Footer" className={s.groups}>
            {FOOTER_GROUPS.map((g) => (
              <div key={g.title}>
                <p className={s.groupTitle}>{g.title}</p>
                <ul>
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className={s.fine}>
          <p>
            SycaMore Live is a student project. Photos and illustrations on this site are AI-generated illustrations, not pictures of real
            events or people. Product screens are the real app running on demo data, and every name in them is made up.
          </p>
          <p>
            <Link href="/trust">How the record works</Link>
          </p>
        </div>
        <div className={s.legal}>
          <nav aria-label="Legal" className={s.legalLinks}>
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <p className={s.cookies}>Essential cookies only, to keep you signed in. No tracking or ads.</p>
          <ThemeToggle variant="inline" className={s.theme} />
        </div>
      </div>
      <Wordmark />
    </footer>
  );
}
