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
import { RowMenu } from './RowMenu';
import s from './volunteers.module.css';

export const metadata = { title: 'Volunteers' };

const TABS = [
  { key: 'all', label: 'Everyone' },
  { key: 'new', label: 'Came once' },
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
  // The attendance strip: the org's last six verified events, oldest to newest.
  const recent = [...ins.verified].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)).slice(-6);
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, t.key === 'all' ? ins.volunteers.length : t.key === 'milestones' ? ins.milestones.length : ins.volunteers.filter((v) => v.status === t.key).length]),
  );

  return (
    <Stagger className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={`${ins.volunteers.length.toLocaleString()} with verified hours`}
        title="Volunteers"
        lede="Built from your events; you never type anyone in."
        help={
          <Help label="About these lists" placement="bottom-end">
            <p>
              <strong>Came once</strong>: one verified event with you so far, ever. (Reports counts people new <em>in the period</em> you pick.)
            </p>
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
        <table className={`t tight ${s.table}`}>
          <thead>
            <tr>
              <th scope="col">Volunteer</th>
              <th scope="col" className={s.stripCol}>
                Last {recent.length} events
              </th>
              <th scope="col" className="r">
                Hours
              </th>
              <th scope="col">{tab === 'milestones' ? 'Milestone' : 'Last came'}</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => {
              const email = v.volunteer_id ? emails.get(v.volunteer_id) : undefined;
              const nudge =
                email && tab === 'milestones' && v.milestone
                  ? { label: 'Thank them', href: milestoneThanks(org, v.name, email, v.milestone.hours, next), icon: 'award' as const }
                  : email && v.status === 'away'
                    ? { label: 'Invite back', href: inviteBack(org, v.name, email, next), icon: 'arrow-up-right' as const }
                    : email && v.status === 'new'
                      ? { label: 'Say thanks', href: sayThanks(org, v.name, email, next), icon: 'message' as const }
                      : null;
              const letter = v.volunteer_id ? { label: 'Hour letter', href: `/org/volunteers/${v.volunteer_id}/letter`, icon: 'report' as const } : null;
              const came = new Set(v.eventIds);
              return (
                <tr key={v.key} className={invite === v.key ? s.invited : undefined}>
                  <td className={s.who}>
                    <span className="avatar">{initials(v.name)}</span>
                    <span className={s.whoText}>
                      <span className={s.nameLine}>
                        <strong>{v.name}</strong>
                        {v.standouts > 0 && (
                          <span className={s.standout} title={`Starred as a standout ${v.standouts} ${v.standouts === 1 ? 'time' : 'times'}`}>
                            {v.standouts}× standout
                          </span>
                        )}
                        {v.badgesEarned.map((b) => (
                          <Chip key={b} tone="green" className={`${s.small} ${s.deskOnly}`}>
                            {badgeByKey[b].name}
                          </Chip>
                        ))}
                        {v.badgesReady.length > 0 && (
                          <Link href="/org/badges" className={`chip chip-amber ${s.small} ${s.deskOnly}`}>
                            {v.badgesReady.length} ready to sign
                          </Link>
                        )}
                      </span>
                      <span className={s.sub}>
                        {ROLE_LABEL[v.topRole]}
                        <span className={s.deskOnly}> · since {fmtDay(v.first_seen)}</span>
                      </span>
                    </span>
                  </td>
                  <td className={s.stripCol}>
                    <span className={s.strip} role="img" aria-label={`Came to ${recent.filter((e) => came.has(e.id)).length} of the last ${recent.length} events`}>
                      {recent.map((e) => (
                        <i key={e.id} data-on={came.has(e.id) || undefined} title={`${e.title}, ${fmtDay(e.starts_at)}`} />
                      ))}
                    </span>
                  </td>
                  <td className={`num r ${s.hours}`}>
                    <strong>{v.hours.toLocaleString()}</strong>
                    <span className={s.hrs}> hrs</span>
                    <span className={s.events}>
                      {v.events} {v.events === 1 ? 'event' : 'events'}
                    </span>
                  </td>
                  <td className={`small ${s.last}`}>
                    {tab === 'milestones' && v.milestone ? (
                      <>
                        <Chip tone="gold" className={s.small}>
                          {v.milestone.hours} hrs
                        </Chip>{' '}
                        <span className="muted">passed {ago(v.milestone.at)}</span>
                      </>
                    ) : (
                      <>
                        {v.status === 'away' ? lastCame(v.last_seen) : ago(v.last_seen)}
                        {v.status === 'new' && (
                          <Chip tone="ink" className={`${s.small} ${s.onceChip}`}>
                            came once
                          </Chip>
                        )}
                      </>
                    )}
                  </td>
                  <td className={s.actionsCell}>
                    {/* Desk: on row hover or focus. Phones: behind ⋯. */}
                    <div className={s.actions}>
                      {nudge && (
                        <a className="btn btn-sm" href={nudge.href}>
                          {nudge.label}
                        </a>
                      )}
                      {letter && (
                        <Link className="btn btn-sm btn-quiet" href={letter.href}>
                          Hour letter
                        </Link>
                      )}
                    </div>
                    <span className={s.phoneMenu}>
                      <RowMenu name={v.name} items={[nudge, letter].filter((x): x is NonNullable<typeof x> => !!x)} />
                    </span>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 0 }}>
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
