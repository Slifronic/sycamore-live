import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { ACTIVITY_LABEL, type EventRow } from '@/lib/types';
import { fmtDate, fmtDay, fmtTime } from '@/lib/format';
import { requestNow } from '@/lib/format';
import { utcToPacific } from '@/lib/tz';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import { listTags, tagsForEvents } from '@/lib/event-intake';
import { Cover } from '@/components/media/Cover';
import { EmptyState } from '@/components/media/EmptyState';
import { coverFor } from '@/lib/covers';
import l from './list.module.css';

export const metadata = { title: 'Events' };

type Row = EventRow & { people: number; hours: number };

export default async function EventsPage({ searchParams }: PageProps<'/org/events'>) {
  const org = await requireOrg();
  const tagParam = (await searchParams).tag;
  const tag = typeof tagParam === 'string' ? tagParam.slice(0, 32) : null;
  const events = (await sql`
    select e.*, count(a.id) filter (where a.status <> 'no_show')::int as people,
      coalesce(sum(coalesce(a.hours_adjusted, a.hours_captured)) filter (where a.status <> 'no_show'), 0)::float as hours
    from event e left join attendance a on a.event_id = e.id
    where e.org_id = ${org.id}
      and (${tag}::text is null or exists (
        select 1 from event_tag et join tag t on t.id = et.tag_id where et.event_id = e.id and lower(t.name) = lower(${tag}::text)))
    group by e.id
    order by e.is_practice desc, e.starts_at desc
  `) as unknown as Row[];
  const now = requestNow();
  // Today's unverified events go first (the live one is what the coordinator opens on the day).
  const todayYmd = utcToPacific(new Date(now)).ymd;
  const isToday = (e: Row) => !e.attested_at && !e.is_practice && utcToPacific(new Date(e.starts_at)).ymd === todayYmd;
  const isLive = (e: Row) => !e.attested_at && new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() >= now;
  const rank = (e: Row) => (isToday(e) ? (isLive(e) ? 0 : 1) : 2);
  events.sort((a, b) => rank(a) - rank(b));
  const [tags, tagMap] = await Promise.all([listTags(org.id), tagsForEvents(events.map((e) => e.id))]);
  const q = (t: string | null) => (t ? `?tag=${encodeURIComponent(t)}` : '');

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow="Run events"
        title="Events"
        lede="Create one, show the QR code on the day, verify it when it ends."
        action={
          <>
            <Link className="btn btn-big" href={`/org/events/calendar${q(tag)}`}>
              Calendar
            </Link>
            <Link className="btn btn-primary btn-big" href="/org/events/new">
              + New event
            </Link>
          </>
        }
      />
      {tags.length > 0 && (
        <Segmented
          id="event-tags"
          label="Filter events by tag"
          items={[
            { href: '/org/events', label: 'All', on: !tag },
            ...tags
              .filter((t) => t.uses > 0 || t.name.toLowerCase() === tag?.toLowerCase())
              .map((t) => ({
                href: `/org/events${q(t.name)}`,
                label: (
                  <>
                    <span
                      className={`tag tag-${t.color}`}
                      style={{
                        background: 'transparent',
                        padding: 0,
                        height: 'auto',
                      }}
                    >
                      {t.name}
                    </span>
                    <span className="muted small num">{t.uses}</span>
                  </>
                ),
                on: t.name.toLowerCase() === tag?.toLowerCase(),
              })),
          ]}
        />
      )}
      {events.length === 0 ? (
        <div className="card">
          {tag ? (
            <EmptyState
              illo="compass"
              title={`No events tagged “${tag}” yet.`}
              action={
                <Link className="btn" href="/org/events">
                  Show all events
                </Link>
              }
            >
              Add the tag when you create or edit an event, and it shows up here and in its calendar feed.
            </EmptyState>
          ) : (
            <EmptyState
              illo="sapling"
              title="No events yet."
              action={
                <Link className="btn btn-primary" href="/org/events/new">
                  + New event
                </Link>
              }
            >
              Every verified hour starts with an event. Make one in under a minute, or paste an invite or flyer and let the form fill itself.
            </EmptyState>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', position: 'relative' }}>
          <table className={`t ${l.table}`}>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">When</th>
                <th scope="col" className={l.narrowHide}>
                  People
                </th>
                <th scope="col" className={l.narrowHide}>
                  Hours
                </th>
                <th scope="col">Status</th>
                <th scope="col" className={l.narrowHide}>
                  <span className="sr-only">Actions</span>
                </th>
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
                const action =
                  !e.attested_at && (ended || e.is_practice) ? (
                    <Link className="btn btn-primary btn-sm" href={`/org/events/${e.id}/verify`}>
                      Verify
                    </Link>
                  ) : (
                    <Link className="btn btn-sm" href={`/org/events/${e.id}`}>
                      {live ? 'Open check-in' : 'Open'}
                    </Link>
                  );
                return (
                  <tr key={e.id}>
                    <td>
                      <div className={l.eventCell}>
                        <Link href={`/org/events/${e.id}`} className={l.thumbLink} tabIndex={-1} aria-hidden>
                          <Cover
                            cover={coverFor({
                              title: e.title,
                              activity: e.activity,
                              tags: tagMap.get(e.id),
                            })}
                            variant="thumb"
                            className={l.thumb}
                            sizes="48px"
                          />
                        </Link>
                        <div className={l.eventText}>
                          <Link href={`/org/events/${e.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>
                            {e.title}
                          </Link>
                          <p className="small muted">
                            {e.is_practice ? 'Practice · only you can see it' : ACTIVITY_LABEL[e.activity]}
                            {e.location ? ` · ${e.location}` : ''}
                          </p>
                          {(tagMap.get(e.id) ?? []).length > 0 && (
                            <span className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                              {(tagMap.get(e.id) ?? []).map((t) => (
                                <span key={t.id} className={`tag tag-${t.color}`}>
                                  {t.name}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`small ${l.when}`}>
                      <span className={l.full}>
                        {fmtDay(e.starts_at)}
                        <br />
                        <span className="muted">
                          {fmtTime(e.starts_at)} to {fmtTime(e.ends_at)}
                        </span>
                      </span>
                      <span className={l.short}>
                        {fmtDate(e.starts_at)}
                        <br />
                        <span className="muted">{fmtTime(e.starts_at)}</span>
                      </span>
                    </td>
                    <td className={`num ${l.narrowHide}`}>{e.people}</td>
                    <td className={`num ${l.narrowHide}`}>{e.hours.toLocaleString()}</td>
                    <td className={l.status}>
                      {status}
                      <span className={l.inlineAction}>{action}</span>
                    </td>
                    <td className={l.narrowHide} style={{ textAlign: 'right' }}>
                      {action}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const instant = false;
