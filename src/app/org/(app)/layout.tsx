import Link from 'next/link';
import { Suspense } from 'react';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { courseProgress } from '@/lib/course';
import { signOut } from '../actions';
import { NavLinks } from '@/components/NavLinks';
import { CoachBar } from '@/components/CoachBar';
import { TierChip } from '@/components/TierChip';
import s from './shell.module.css';
import { initials } from '@/lib/format';

// Every org screen reads the coordinator's cookie, so it renders per request.
export const instant = false;

export default async function OrgShell({ children }: LayoutProps<'/org'>) {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const course = courseProgress(org.course);

  return (
    <div className={s.shell}>
      <aside className={`${s.side} no-print`}>
        <Link href="/org" className={s.brand}>
          <span className={s.leaf} aria-hidden>❦</span> SycaMore
        </Link>
        <div className={s.org}>
          <span className={s.tile} aria-hidden>
            {initials(org.name)}
          </span>
          <div className={s.orgText}>
            <p className={s.orgName}>{org.name}</p>
            <p className="muted small">{org.kind === 'school' ? 'School' : 'Nonprofit'} · {org.coordinator_name}</p>
          </div>
          <div className={s.orgTier}>
            <TierChip tier={ins.index.tier} provisional={ins.index.provisional} score={ins.index.score} />
          </div>
        </div>
        <NavLinks awaiting={ins.totals.awaiting} badgeReady={ins.badgeReady.length} />
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
          <p className="small muted">PIN {org.coordinator_pin}</p>
          <button className="btn btn-quiet btn-sm">Sign out</button>
        </form>
      </aside>
      <main className={s.main}>
        <Suspense>
          <CoachBar />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
