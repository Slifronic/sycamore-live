import type { Metadata } from 'next';
import Link from 'next/link';
import { currentVolunteer } from '@/lib/vol-data';
import { volunteerThreads } from '@/lib/messages';
import { volunteerChats } from '@/lib/event-chat';
import { initials, requestNow } from '@/lib/format';
import { VolTabBar, VolTopBar } from '@/components/vol/VolNav';
import { DemoRibbon } from '@/components/DemoRibbon';
import { Leaf } from '@/components/media/Leaf';
import { RouteTransition } from '@/components/motion/RouteTransition';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import s from '@/components/vol/volnav.module.css';

// The volunteer app's shell, mobile first: a greeting bar and a bottom tab
// bar (Home, Discover, Messages, Me) on phones; one top bar with the same
// tabs on desktop, over a centred column. Signed out (/join), it's just the
// brand. Sign out and the theme live on the Me tab (/me/account).

export const metadata: Metadata = { title: { default: 'Volunteer', template: '%s · SycaMore Live' }, robots: { index: false, follow: false } };

export const instant = false;

export default async function VolShell({ children }: LayoutProps<'/'>) {
  const vol = await currentVolunteer();
  if (!vol) {
    return (
      <>
        <DemoRibbon />
        <div className={s.bare}>
          <header className={s.bareHead}>
            <Link href="/" className={s.brand}>
              <Leaf size={22} color="var(--canopy)" /> SycaMore
            </Link>
            <div className={s.bareRight}>
              <Link href="/org/login" className={s.signin}>
                Coordinator? Sign in
              </Link>
              <ThemeToggle tooltip="left" />
            </div>
          </header>
          <main className={s.bareMain} id="main">
            {children}
          </main>
        </div>
      </>
    );
  }

  const [threads, chats] = await Promise.all([volunteerThreads(vol.id), volunteerChats(vol.id)]);
  const unread = threads.reduce((n, t) => n + t.unread, 0) + chats.reduce((n, c) => n + c.unread, 0);
  const hour = Number(new Date(requestNow()).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false })) % 24;
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <DemoRibbon />
      <div className={s.shell}>
        <a className="skip no-print" href="#main">
          Skip to content
        </a>
        <VolTopBar greeting={greeting} first={vol.name.split(' ')[0]} initials={initials(vol.name)} unread={unread} />
        <main className={s.main} id="main" tabIndex={-1}>
          <RouteTransition groups={['/discover']}>{children}</RouteTransition>
        </main>
        <VolTabBar unread={unread} />
      </div>
    </>
  );
}
