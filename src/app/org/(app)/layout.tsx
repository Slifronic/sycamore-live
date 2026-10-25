import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { courseProgress } from '@/lib/course';
import { unreadCount } from '@/lib/messages';
import { orgChatUnread } from '@/lib/event-chat';
import { signOut } from '../actions';
import { NavLinks } from '@/components/NavLinks';
import { CoachBar } from '@/components/CoachBar';
import s from './shell.module.css';
import { initials } from '@/lib/format';
import { PinReveal } from '@/components/PinReveal';
import { DemoRibbon } from '@/components/DemoRibbon';
import { Leaf } from '@/components/media/Leaf';
import { RouteTransition } from '@/components/motion/RouteTransition';

// Every org screen reads the coordinator's cookie, so it renders per request.
export const instant = false;

export const metadata: Metadata = { title: { default: 'Coordinator', template: '%s · SycaMore Live' }, robots: { index: false, follow: false } };

export default async function OrgShell({ children }: LayoutProps<'/org'>) {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const course = courseProgress(org.course);
  // Unread one-to-one replies plus unread posts in event chats.
  const unread = (await unreadCount(org.id)) + (await orgChatUnread(org.id));

  return (
    <>
      <DemoRibbon />
      <div className={s.shell}>
        <a className="skip no-print" href="#main">
          Skip to content
        </a>
        <aside className={`${s.side} no-print`}>
          <Link href="/org" className={s.brand}>
            <Leaf size={22} color="var(--canopy)" className={s.leaf} /> SycaMore
          </Link>
          <div className={s.org}>
            <span className={s.tile} aria-hidden>
              {initials(org.name)}
            </span>
            <div className={s.orgText}>
              <p className={s.orgName}>{org.name}</p>
              <p className="muted small">{org.kind === 'school' ? 'School' : 'Nonprofit'} · {org.coordinator_name}</p>
            </div>
            <div className={s.orgFact}>
              <span className="chip chip-ink" title="Hours you have verified, from check-ins and your sign-offs">
                {ins.totals.verifiedHours.toLocaleString()} verified hours
              </span>
            </div>
          </div>
          <NavLinks awaiting={ins.totals.awaiting} badgeReady={ins.badgeReady.length} unread={unread} />
          {!course.complete && (
            <Link href="/org/learn" className={s.course}>
              <span className="small" style={{ fontWeight: 700 }}>Getting started</span>
              <span className="small muted">
                {course.done} of {course.total} lessons · about {course.minutesLeft} min left
              </span>
              <span className="bar" style={{ marginTop: 6 }}>
                <span style={{ width: `${(100 * course.done) / course.total}%` }} />
              </span>
            </Link>
          )}
          <form action={signOut} className={s.signout}>
            <PinReveal pin={org.coordinator_pin} />
            <button className="btn btn-quiet btn-sm">Sign out</button>
          </form>
        </aside>
        <main className={s.main} id="main" tabIndex={-1}>
          <Suspense>
            <CoachBar />
          </Suspense>
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </>
  );
}
