import Link from 'next/link';
import { FOOTER_GROUPS } from './nav';
import { Wordmark } from './Wordmark';
import s from './footer.module.css';

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
      </div>
      <Wordmark />
    </footer>
  );
}
