import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { markLesson } from '@/lib/org-data';
import { sql } from '@/lib/db';
import { AWAY_AFTER_DAYS, loadOrgInsights } from '@/lib/insights';
import { badgeByKey } from '@/lib/badges';
import { ROLE_LABEL } from '@/lib/types';
import { ago, fmtDay, initials } from '@/lib/format';
import { inviteBack, milestoneThanks, sayThanks } from '@/lib/mailto';
import { lastCame, requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { Help } from '../messages/Help';
import s from './volunteers.module.css';

export const metadata = { title: 'Volunteers' };

const TABS = [
  { key: 'all', label: 'Everyone' },
  { key: 'new', label: 'First-timers' },
  { key: 'active', label: 'Regulars' },
  { key: 'away', label: 'Away 30+ days' },
  { key: 'milestones', label: 'Milestones' },
] as const;

export default async function VolunteersPage({ searchParams }: PageProps<'/org/volunteers'>) {
  const org = await requireOrg();
  const sp = await searchParams;
  const tab = (typeof sp.tab === 'string' ? sp.tab : 'all') as (typeof TABS)[number]['key'];
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const invite = typeof sp.invite === 'string' ? sp.invite : null;
  await markLesson(org.id, 'index_viewed');
  const ins = await loadOrgInsights(org.id);
  const emails = new Map(
    ((await sql`select id, email from volunteer where id = any(${ins.volunteers.map((v) => v.volunteer_id).filter(Boolean) as string[]})`) as unknown as { id: string; email: string }[]).map(
      (r) => [r.id, r.email],
    ),
  );
  const next = ins.events.find((e) => !e.is_practice && new Date(e.starts_at).getTime() > requestNow() && !e.attested_at);
  // Milestones: passed 10, 25, 50, 100 or 250 verified hours in the last 30 days (lib/insights).
  const base = tab === 'milestones' ? ins.milestones : ins.volunteers.filter((v) => tab === 'all' || v.status === tab);
  const list = base.filter((v) => !q || v.name.toLowerCase().includes(q));
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, t.key === 'all' ? ins.volunteers.length : t.key === 'milestones' ? ins.milestones.length : ins.volunteers.filter((v) => v.status === t.key).length]),
  );

  return (
    <Stagger className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={`${ins.volunteers.length.toLocaleString()} with verified hours`}
        title="Volunteers"
        lede="Built from your events; you never type anyone in."
        controls={
          <Help label="About these lists" placement="bottom-end">
            <p>
              <strong>Away</strong>: came at least twice, but not in the last {AWAY_AFTER_DAYS} days. “Invite back” opens a ready-to-send email with your next event in it.
            </p>
            <p>
              <strong>Milestones</strong>: passed 10, 25, 50, 100 or 250 verified hours this month. Two lines of thanks from you is enough.
            </p>
          </Help>
        }
        action={
          <a className="btn" href="/api/org/reports/csv">
            <Icon name="download" size={16} /> Export CSV
          </a>
        }
      />

      <div className={s.bar}>
        <Segmented
          id="volunteers"
          label="Filter volunteers"
          className={`seg-tiles ${s.tiles}`}
          items={TABS.map((t) => ({
            href: `/org/volunteers?tab=${t.key}`,
            on: tab === t.key,
            label: (
              <>
                <span className={`figure ${s.tileNum}`}>{counts[t.key]}</span>
                <span className={s.tileLabel}>{t.label}</span>
              </>
            ),
          }))}
        />
        <form className={s.search} role="search">
          <input type="hidden" name="tab" value={tab} />
          <Icon name="search" size={16} />
          <input className="input" name="q" defaultValue={q} placeholder="Find a name" aria-label="Find a name" />
        </form>
      </div>

      <div className={`card ${s.tableCard}`}>
        <table className="t tight">
          <thead>
            <tr>
              <th scope="col">Volunteer</th>
              <th scope="col">Served</th>
              <th scope="col">{tab === 'milestones' ? 'Milestone' : 'Last came'}</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => {
              const email = v.volunteer_id ? emails.get(v.volunteer_id) : undefined;
              return (
                <tr key={v.key} className={invite === v.key ? s.invited : undefined}>
                  <td>
                    <span className="row" style={{ gap: 10 }}>
                      <span className="avatar">{initials(v.name)}</span>
                      <span>
                        <strong>{v.name}</strong>
                        {v.standouts > 0 && (
                          <span className={s.standout} title={`Starred as a standout ${v.standouts} ${v.standouts === 1 ? 'time' : 'times'}`}>
                            {' '}
                            · {v.standouts}× standout
                          </span>
                        )}
                        <br />
                        <span className="small muted">
                          {ROLE_LABEL[v.topRole]} · since {fmtDay(v.first_seen)}
                        </span>
                        {(v.badgesEarned.length > 0 || v.badgesReady.length > 0) && (
                          <span className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                            {v.badgesEarned.map((b) => (
                              <Chip key={b} tone="green" className={s.small}>
                                {badgeByKey[b].name}
                              </Chip>
                            ))}
                            {v.badgesReady.length > 0 && (
                              <Link href="/org/badges" className={`chip chip-amber ${s.small}`}>
                                {v.badgesReady.length} ready to sign
                              </Link>
                            )}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="num small" style={{ whiteSpace: 'nowrap' }}>
                    <strong>{v.hours.toLocaleString()} hrs</strong>
                    <br />
                    <span className="muted">{v.events} {v.events === 1 ? 'event' : 'events'}</span>
                  </td>
                  <td className="small">
                    {tab === 'milestones' && v.milestone ? (
                      <>
                        <Chip tone="gold" className={s.small}>
                          {v.milestone.hours} hrs
                        </Chip>
                        <br />
                        <span className="muted">passed {ago(v.milestone.at)}</span>
                      </>
                    ) : (
                      <>
                        {v.status === 'away' ? lastCame(v.last_seen) : ago(v.last_seen)}
                        {v.status === 'new' && (
                          <>
                            <br />
                            <Chip tone="ink" className={s.small}>
                              first-timer
                            </Chip>
                          </>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    <div className={s.actions}>
                    {email && tab === 'milestones' && v.milestone ? (
                      <a className="btn btn-sm" href={milestoneThanks(org, v.name, email, v.milestone.hours, next)}>
                        Thank them
                      </a>
                    ) : email && v.status === 'away' ? (
                      <a className="btn btn-sm" href={inviteBack(org, v.name, email, next)}>
                        Invite back
                      </a>
                    ) : email && v.status === 'new' ? (
                      <a className="btn btn-sm" href={sayThanks(org, v.name, email, next)}>
                        Say thanks
                      </a>
                    ) : null}
                    {v.volunteer_id && (
                      <Link className="btn btn-sm btn-quiet" href={`/org/volunteers/${v.volunteer_id}/letter`}>
                        Hour letter
                      </Link>
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 0 }}>
                  {ins.volunteers.length === 0 ? (
                    <EmptyState
                      icon="users"
                      title="No volunteers yet"
                      hint="People appear here after your first verified event, each with an hour letter."
                      action={
                        <Link className="btn btn-primary btn-sm" href="/org/events">
                          Go to events
                        </Link>
                      }
                    />
                  ) : (
                    <EmptyState
                      compact
                      icon={q ? 'search' : tab === 'milestones' ? 'award' : 'users'}
                      title={q ? `Nobody matches “${q}”` : tab === 'milestones' ? 'No milestones this month' : 'Nobody in this list'}
                      hint={q ? 'Check the spelling, or search by first name only.' : tab === 'milestones' ? 'When someone passes 10, 25, 50 or 100 verified hours, they show up here.' : 'Try another tab.'}
                      action={
                        <Link className="btn btn-sm" href="/org/volunteers">
                          Show everyone
                        </Link>
                      }
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Stagger>
  );
}

export const instant = false;
