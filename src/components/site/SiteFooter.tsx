import Link from 'next/link';
import { FOOTER_GROUPS } from './nav';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from '../shell/ThemeToggle';
import s from './footer.module.css';

const LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/data', label: 'Your data' },
  { href: '/licenses', label: 'Licenses' },
] as const;

// vengeance-ui footer/five's shape on the site's one dark panel: the brand and
// the two ways in over a rule, the link groups (legal is a fourth group), then
// a quiet bottom bar with the cookie line and the theme switch.

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.top}>
          <div className={s.about}>
            <p className={s.brand}>
              <BrandMark tone="panel" />
            </p>
            <p className={s.blurb}>Volunteer hours captured at the event, confirmed by the organization, and checkable by anyone with the link.</p>
          </div>
          <div className={s.ways}>
            <Link href="/org/start" className={s.wayPrimary}>
              Start free
            </Link>
            <Link href="/join" className={s.way}>
              Join as a volunteer
            </Link>
          </div>
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
          <div>
            <p className={s.groupTitle}>Legal</p>
            <ul>
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <p className={s.fine}>
          SycaMore Live is a student project, built at Cal Hacks 13.0 (Oct 23–25, 2026) and running as a demo. Photos on this site are AI-generated, not
          pictures of real events or people. Product screens and drawings use demo data, and every name in them is made up.
        </p>

        <div className={s.bottom}>
          <p className={s.cookies}>Essential cookies only, to keep you signed in. No tracking or ads.</p>
          <ThemeToggle variant="inline" className={s.theme} />
        </div>
      </div>
    </footer>
  );
}
