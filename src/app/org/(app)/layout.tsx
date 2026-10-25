import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { courseProgress } from '@/lib/course';
import { unreadCount } from '@/lib/messages';
import { orgChatUnread } from '@/lib/event-chat';
import { ago, initials, requestNow } from '@/lib/format';
import { signOut } from '../actions';
import { OrgRail, OrgTabBar } from '@/components/NavLinks';
import { CoachBar } from '@/components/CoachBar';
import { DemoRibbon } from '@/components/DemoRibbon';
import { RouteTransition } from '@/components/motion/RouteTransition';
import { OrgTopBar } from '@/components/shell/OrgTopBar';
import { CommandPalette } from '@/components/shell/CommandPalette';
import s from './shell.module.css';

// Every org screen reads the coordinator's cookie, so it renders per request.
export const instant = false;

export const metadata: Metadata = { title: { default: 'Coordinator', template: '%s · SycaMore Live' }, robots: { index: false, follow: false } };

// The coordinator shell (REDESIGN-2026-10-25, the "Vessa" layout): a top bar
// across the page, a slim icon rail on the left, the page in the middle. On
// phones the rail becomes a bottom tab bar. ⌘K opens the command palette.
export default async function OrgShell({ children }: LayoutProps<'/org'>) {
  const org = await requireOrg();
  const [ins, inboxUnread, chatUnread] = await Promise.all([loadOrgInsights(org.id), unreadCount(org.id), orgChatUnread(org.id)]);
  const course = courseProgress(org.course);
  const now = requestNow();

  // Pacific time, like every date in the app.
  const hour = Number(new Date(now).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false })) % 24;
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // The bell: events that ended and still need the coordinator's sign-off, oldest first.
  const waiting = [...ins.awaiting]
    .sort((a, b) => +new Date(a.ends_at) - +new Date(b.ends_at))
    .slice(0, 5)
    .map((e) => ({ id: e.id, title: e.title, ended: ago(e.ends_at, new Date(now)) }));

  // "Import paper sheet" goes to the live event, else the most recent one not yet verified.
  const started = ins.realEvents.filter((e) => new Date(e.starts_at).getTime() <= now);
  const live = started.find((e) => !e.attested_at && new Date(e.ends_at).getTime() >= now);
  const target = live ?? started.find((e) => !e.attested_at) ?? started[0];
  const importHref = target ? `/org/events/${target.id}?import=1#import` : null;

  const counts = { awaiting: ins.totals.awaiting, unread: inboxUnread + chatUnread, badges: ins.badgeReady.length };
  const courseInfo = { done: course.done, total: course.total, complete: course.complete };

  return (
    <>
      <DemoRibbon />
      <div className={s.shell}>
        <a className="skip no-print" href="#main">
          Skip to content
        </a>
        <OrgTopBar
          org={{ name: org.name, initials: initials(org.name), kind: org.kind === 'school' ? 'School' : 'Nonprofit' }}
          me={{ name: org.coordinator_name, first: org.coordinator_name.split(' ')[0], initials: initials(org.coordinator_name), pin: org.coordinator_pin }}
          greeting={greeting}
          waiting={waiting}
          waitingCount={ins.totals.awaiting}
          badgesReady={ins.badgeReady.length}
          importHref={importHref}
          viewCounts={{ unread: inboxUnread, chatUnread }}
          signOut={signOut}
        />
        <OrgRail counts={counts} course={courseInfo} />
        <main className={s.main} id="main" tabIndex={-1}>
          <div className={s.col}>
            <Suspense>
              <CoachBar />
            </Suspense>
            <RouteTransition>{children}</RouteTransition>
          </div>
        </main>
        <OrgTabBar counts={counts} course={courseInfo} signOut={signOut} />
        <CommandPalette importHref={importHref} />
      </div>
    </>
  );
}
