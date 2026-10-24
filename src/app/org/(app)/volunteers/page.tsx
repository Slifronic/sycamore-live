import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { markLesson } from '@/lib/org-data';
import { sql } from '@/lib/db';
import { loadOrgInsights, SLIPPING_AFTER_DAYS } from '@/lib/insights';
import { badgeByKey } from '@/lib/badges';
import { ROLE_LABEL } from '@/lib/types';
import { ago, fmtDay, initials } from '@/lib/format';
import { inviteBack, sayThanks } from '@/lib/mailto';
import { requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';

const TABS = [
  { key: 'all', label: 'Everyone' },
  { key: 'new', label: 'First-timers' },
  { key: 'active', label: 'Regulars' },
  { key: 'slipping', label: 'Slipping away' },
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
  const list = ins.volunteers.filter((v) => (tab === 'all' || v.status === tab) && (!q || v.name.toLowerCase().includes(q)));
  const counts = Object.fromEntries(TABS.map((t) => [t.key, t.key === 'all' ? ins.volunteers.length : ins.volunteers.filter((v) => v.status === t.key).length]));

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={`People · ${ins.volunteers.length.toLocaleString()} with verified hours`}
        title="Volunteers"
        lede="Built from your events; you never type anyone in."
        action={
          <a className="btn" href="/api/org/reports/csv">
            Download hours (CSV)
          </a>
        }
      />

      <div className="row between wrap" style={{ alignItems: 'end' }}>
        <Segmented
          id="volunteers"
          label="Filter volunteers"
          className="seg-tiles"
          items={TABS.map((t) => ({
            href: `/org/volunteers?tab=${t.key}`,
            on: tab === t.key,
            label: (
              <>
                <span className="figure" style={{ fontSize: 24, color: t.key === 'slipping' && counts[t.key] > 0 ? 'var(--amber)' : undefined }}>
                  {counts[t.key]}
                </span>
                <span className="eyebrow" style={{ fontSize: 10.5 }}>{t.label}</span>
              </>
            ),
          }))}
        />
        <form className="row" role="search">
          <input type="hidden" name="tab" value={tab} />
          <input className="input" style={{ height: 40, width: 220 }} name="q" defaultValue={q} placeholder="Find a name" aria-label="Find a name" />
        </form>
      </div>
      {tab === 'slipping' && (
        <p className="notice notice-amber small">
          Came at least twice, but not in the last {SLIPPING_AFTER_DAYS} days. “Invite back” opens a ready-to-send email with your next event in it.
        </p>
      )}

      <div className="card" style={{ overflowX: 'auto', position: 'relative' }}>
        <table className="t tight">
          <thead>
            <tr>
              <th scope="col">Volunteer</th>
              <th scope="col">Served</th>
              <th scope="col">Last came</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => {
              const email = v.volunteer_id ? emails.get(v.volunteer_id) : undefined;
              return (
                <tr key={v.key} style={invite === v.key ? { outline: '2px solid var(--amber)' } : undefined}>
                  <td>
                    <span className="row" style={{ gap: 10 }}>
                      <span className="avatar">{initials(v.name)}</span>
                      <span>
                        <strong>{v.name}</strong>
                        {v.standouts > 0 && <span className="small" style={{ color: 'var(--gold)' }}> · ★ {v.standouts}</span>}
                        <br />
                        <span className="small muted">
                          {ROLE_LABEL[v.topRole]} · since {fmtDay(v.first_seen)}
                        </span>
                        {(v.badgesEarned.length > 0 || v.badgesReady.length > 0) && (
                          <span className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                            {v.badgesEarned.map((b) => (
                              <span key={b} className="chip chip-green" style={{ height: 20, fontSize: 11 }}>
                                {badgeByKey[b].name}
                              </span>
                            ))}
                            {v.badgesReady.length > 0 && (
                              <Link href="/org/badges" className="chip chip-amber" style={{ height: 20, fontSize: 11 }}>
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
                    {ago(v.last_seen)}
                    {v.status === 'slipping' && (
                      <>
                        <br />
                        <span className="chip chip-amber">slipping</span>
                      </>
                    )}
                    {v.status === 'new' && (
                      <>
                        <br />
                        <span className="chip chip-ink">first-timer</span>
                      </>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    {email && v.status === 'slipping' ? (
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
                <td colSpan={4} className="muted">
                  {ins.volunteers.length === 0 ? 'Volunteers appear here after your first verified event.' : 'Nobody matches.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const instant = false;
