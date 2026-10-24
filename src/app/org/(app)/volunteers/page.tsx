import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { loadOrgInsights, SLIPPING_AFTER_DAYS } from '@/lib/insights';
import { badgeByKey } from '@/lib/badges';
import { ROLE_LABEL } from '@/lib/types';
import { ago, fmtDay, initials } from '@/lib/format';
import { requestNow } from '@/lib/format';

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
  const ins = await loadOrgInsights(org.id);
  const emails = new Map(
    ((await sql`select id, email from volunteer where id = any(${ins.volunteers.map((v) => v.volunteer_id).filter(Boolean) as string[]})`) as unknown as { id: string; email: string }[]).map(
      (r) => [r.id, r.email],
    ),
  );
  const next = ins.events.find((e) => !e.is_practice && new Date(e.starts_at).getTime() > requestNow() && !e.attested_at);
  const list = ins.volunteers.filter((v) => (tab === 'all' || v.status === tab) && (!q || v.name.toLowerCase().includes(q)));
  const counts = Object.fromEntries(TABS.map((t) => [t.key, t.key === 'all' ? ins.volunteers.length : ins.volunteers.filter((v) => v.status === t.key).length]));

  const mailto = (name: string, email: string) => {
    const first = name.split(' ')[0];
    const body = `Hi ${first},\n\nWe miss you at ${org.name}! ${
      next ? `Our next event is ${next.title} on ${fmtDay(next.starts_at)}${next.location ? ` at ${next.location}` : ''}. ` : ''
    }Would you like to come?\n\nThanks for everything you've done with us.\n${org.coordinator_name}`;
    return `mailto:${email}?subject=${encodeURIComponent(`We miss you at ${org.name}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 1120 }}>
      <header className="row between wrap">
        <div>
          <h1>Volunteers</h1>
          <p className="muted">Everyone with verified hours. Built from your events; you never type anyone in.</p>
        </div>
        <a className="btn" href="/api/org/reports/csv">
          Download hours (CSV)
        </a>
      </header>

      <div className="row between wrap">
        <nav className="row wrap" style={{ gap: 6 }} aria-label="Filter">
          {TABS.map((t) => (
            <Link key={t.key} href={`/org/volunteers?tab=${t.key}`} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : ''}`}>
              {t.label} <span style={{ opacity: 0.7 }}>{counts[t.key]}</span>
            </Link>
          ))}
        </nav>
        <form className="row">
          <input type="hidden" name="tab" value={tab} />
          <input className="input" style={{ height: 36, width: 220 }} name="q" defaultValue={q} placeholder="Find a name" aria-label="Find a name" />
        </form>
      </div>
      {tab === 'slipping' && (
        <p className="notice notice-amber small">
          Came at least twice, but not in the last {SLIPPING_AFTER_DAYS} days. “Invite back” opens a ready-to-send email with your next event in it.
        </p>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="t">
          <thead>
            <tr>
              <th>Volunteer</th>
              <th>Events</th>
              <th>Hours</th>
              <th>Highest role</th>
              <th>Last came</th>
              <th>Badges</th>
              <th />
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
                        <span className="small muted">since {fmtDay(v.first_seen)}</span>
                      </span>
                    </span>
                  </td>
                  <td className="num">{v.events}</td>
                  <td className="num">{v.hours.toLocaleString()}</td>
                  <td className="small">{ROLE_LABEL[v.topRole]}</td>
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
                  <td className="small">
                    {v.badgesEarned.map((b) => (
                      <span key={b} className="chip chip-green" style={{ margin: '0 4px 4px 0' }}>
                        {badgeByKey[b].name}
                      </span>
                    ))}
                    {v.badgesReady.length > 0 && (
                      <Link href="/org/badges" className="chip chip-amber">
                        {v.badgesReady.length} ready to sign
                      </Link>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {v.volunteer_id && (
                      <Link className="btn btn-sm btn-quiet" href={`/org/volunteers/${v.volunteer_id}/letter`}>
                        Hour letter
                      </Link>
                    )}{' '}
                    {email && v.status === 'slipping' ? (
                      <a className="btn btn-sm btn-primary" href={mailto(v.name, email)}>
                        Invite back
                      </a>
                    ) : email && v.status === 'new' ? (
                      <a className="btn btn-sm" href={mailto(v.name, email)}>
                        Say thanks
                      </a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
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
