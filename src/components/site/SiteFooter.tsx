import Link from 'next/link';
import { FOOTER_GROUPS } from './nav';
import { BrandMark } from './BrandMark';
import { Botanicals } from './Botanicals';
import { Divider } from './Divider';
import { ThemePicker } from './ThemePicker';
import s from './footer.module.css';

const LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/data', label: 'Your data' },
  { href: '/licenses', label: 'Licenses' },
] as const;

// vengeance-ui footer/one and footer/five, on the forest floor: the page ends
// in a canopy silhouette, then the brand and the two ways in over a rule, the
// link groups (legal is a fourth group), and a quiet bottom bar with the
// cookie line and the palette picker. Light in every palette.

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <Divider edge="top" shape="canopy" />
      <Botanicals
        items={[
          { kind: 'fern', right: '3%', bottom: '-30px', size: 220, rotate: -8, tone: 'soft', wide: true },
          { kind: 'leaf', right: '18%', top: '30px', size: 120, rotate: 20, tone: 'soft', wide: true },
          { kind: 'seed', left: '46%', top: '60px', size: 70, rotate: -16, tone: 'soft', wide: true },
        ]}
      />
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
          <div className={s.theme}>
            <span className={s.themeLabel} aria-hidden="true">
              Theme
            </span>
            <ThemePicker />
          </div>
        </div>
      </div>
    </footer>
  );
}
