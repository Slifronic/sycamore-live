import type { Metadata } from 'next';
import Link from 'next/link';
import { currentVolunteer } from '@/lib/vol-data';
import { volunteerThreads } from '@/lib/messages';
import { volunteerChats } from '@/lib/event-chat';
import { initials } from '@/lib/format';
import { VolSideNav, VolTabBar } from '@/components/vol/VolNav';
import { volSignOut } from './actions';
import s from './vol.module.css';

// The volunteer side's shell. Same look as the coordinator's (parchment,
// sidebar, Fraunces headings) so it reads as one product: a sidebar on
// desktop, a bottom tab bar on phones. Signed out (/join), it's just the brand.

export const metadata: Metadata = { title: 'SycaMore Live · Volunteer', robots: { index: false, follow: false } };

export const instant = false;

export default async function VolShell({ children }: LayoutProps<'/'>) {
  const vol = await currentVolunteer();
  if (!vol) {
    return (
      <div className={s.bare}>
        <header className={s.bareHead}>
          <Link href="/" className={s.brand}>
            <span aria-hidden>❦</span> SycaMore
          </Link>
          <Link href="/org/login" className="small muted">
            Coordinator? Sign in
          </Link>
        </header>
        <main className={s.bareMain} id="main">
          {children}
        </main>
      </div>
    );
  }

  const [threads, chats] = await Promise.all([volunteerThreads(vol.id), volunteerChats(vol.id)]);
  const unread = threads.reduce((n, t) => n + t.unread, 0) + chats.reduce((n, c) => n + c.unread, 0);

  return (
    <div className={s.shell}>
      <a className="skip no-print" href="#main">
        Skip to content
      </a>
      <aside className={`${s.side} no-print`}>
        <Link href="/me" className={s.brand}>
          <span aria-hidden>❦</span> SycaMore
        </Link>
        <div className={s.who}>
          <span className={s.tile} aria-hidden>
            {initials(vol.name)}
          </span>
          <div className={s.whoText}>
            <p className={s.whoName}>{vol.name}</p>
            <p className="muted small">{vol.is_minor ? 'Volunteer · under 18' : 'Volunteer'}</p>
          </div>
        </div>
        <VolSideNav unread={unread} />
        <form action={volSignOut} className={s.signout}>
          <span className="small muted">Not {vol.name.split(' ')[0]}?</span>
          <button className="btn btn-quiet btn-sm">Sign out</button>
        </form>
      </aside>
      <main className={s.main} id="main" tabIndex={-1}>
        {children}
      </main>
      <VolTabBar unread={unread} />
    </div>
  );
}
