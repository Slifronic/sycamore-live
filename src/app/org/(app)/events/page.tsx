import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { ACTIVITY_LABEL, type EventRow } from '@/lib/types';
import { fmtDay, fmtTime } from '@/lib/format';
import { requestNow } from '@/lib/format';

type Row = EventRow & { people: number; hours: number };

export default async function EventsPage() {
  const org = await requireOrg();
  const events = (await sql`
    select e.*, count(a.id) filter (where a.status <> 'no_show')::int as people,
      coalesce(sum(coalesce(a.hours_adjusted, a.hours_captured)) filter (where a.status <> 'no_show'), 0)::float as hours
    from event e left join attendance a on a.event_id = e.id
    where e.org_id = ${org.id}
    group by e.id
    order by e.is_practice desc, e.starts_at desc
  `) as unknown as Row[];
  const now = requestNow();

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 1120 }}>
      <header className="row between wrap">
        <div>
          <h1>Events</h1>
          <p className="muted">Create one, show the QR code on the day, verify it when it ends.</p>
        </div>
        <Link className="btn btn-primary btn-big" href="/org/events/new">
          + New event
        </Link>
      </header>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="t">
          <thead>
            <tr>
              <th>Event</th>
              <th>When</th>
              <th>People</th>
              <th>Hours</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const ended = new Date(e.ends_at).getTime() < now;
              const live = !ended && new Date(e.starts_at).getTime() <= now;
              const status = e.attested_at ? (
                <span className="chip chip-green">✓ Verified</span>
              ) : ended ? (
                <span className="chip chip-amber">Needs verification</span>
              ) : live ? (
                <span className="chip chip-green">● Live now</span>
              ) : (
                <span className="chip chip-ink">Upcoming</span>
              );
              return (
                <tr key={e.id}>
                  <td>
                    <Link href={`/org/events/${e.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>
                      {e.title}
                    </Link>
                    <p className="small muted">
                      {e.is_practice ? 'Practice · only you can see it' : ACTIVITY_LABEL[e.activity]}
                      {e.location ? ` · ${e.location}` : ''}
                    </p>
                  </td>
                  <td className="small">
                    {fmtDay(e.starts_at)}
                    <br />
                    <span className="muted">
                      {fmtTime(e.starts_at)} to {fmtTime(e.ends_at)}
                    </span>
                  </td>
                  <td className="num">{e.people}</td>
                  <td className="num">{e.hours.toLocaleString()}</td>
                  <td>{status}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!e.attested_at && (ended || e.is_practice) ? (
                      <Link className="btn btn-primary btn-sm" href={`/org/events/${e.id}/verify`}>
                        Verify
                      </Link>
                    ) : (
                      <Link className="btn btn-sm" href={`/org/events/${e.id}`}>
                        {live ? 'Open check-in' : 'Open'}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const instant = false;
