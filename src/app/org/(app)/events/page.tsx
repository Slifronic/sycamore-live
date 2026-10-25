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
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { coverFor } from '@/lib/covers';
import { TagMenu } from './TagMenu';
import l from './list.module.css';

export const metadata = { title: 'Events' };

type Row = EventRow & { people: number; hours: number };
type Show = 'all' | 'waiting' | 'upcoming' | 'verified';

export default async function EventsPage({ searchParams }: PageProps<'/org/events'>) {
  const org = await requireOrg();
  const sp = await searchParams;
  const tag = typeof sp.tag === 'string' ? sp.tag.slice(0, 32) : null;
  const show: Show = sp.show === 'waiting' || sp.show === 'upcoming' || sp.show === 'verified' ? sp.show : 'all';
  const all = (await sql`
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
  // A live event goes first, then the rest of today's unverified events: on the day, that's what the coordinator opens.
  const todayYmd = utcToPacific(new Date(now)).ymd;
  const isToday = (e: Row) => !e.attested_at && !e.is_practice && utcToPacific(new Date(e.starts_at)).ymd === todayYmd;
  const isLive = (e: Row) => !e.attested_at && new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() >= now;
  const rank = (e: Row) => (isLive(e) ? 0 : isToday(e) ? 1 : 2);
  all.sort((a, b) => rank(a) - rank(b));

  const stateOf = (e: Row): Exclude<Show, 'all'> => (e.attested_at ? 'verified' : new Date(e.ends_at).getTime() < now ? 'waiting' : 'upcoming');
  const counts = { all: all.length, waiting: 0, upcoming: 0, verified: 0 };
  for (const e of all) counts[stateOf(e)] += 1;
  const events = show === 'all' ? all : all.filter((e) => stateOf(e) === show);

  const [tags, tagMap] = await Promise.all([listTags(org.id), tagsForEvents(events.map((e) => e.id))]);
  const href = (o: { show?: Show; tag?: string | null }) => {
    const q = new URLSearchParams();
    const sh = o.show ?? show;
    const tg = o.tag === undefined ? tag : o.tag;
    if (sh !== 'all') q.set('show', sh);
    if (tg) q.set('tag', tg);
    const str = q.toString();
    return `/org/events${str ? `?${str}` : ''}`;
  };
  const views: { key: Show; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'waiting', label: 'Needs you' },
    { key: 'upcoming', label: 'Coming up' },
    { key: 'verified', label: 'Verified' },
  ];
  const usedTags = tags.filter((t) => t.uses > 0 || t.name.toLowerCase() === tag?.toLowerCase());

  return (
    <Stagger className="page">
      <PageHeader
        className={l.head}
        eyebrow="Run events"
        title="Events"
        controls={
          <Segmented
            id="event-show"
            size="sm"
            label="Show events"
            items={views.map((v) => ({
              href: href({ show: v.key }),
              on: show === v.key,
              label: (
                <>
                  {v.label}
                  {v.key !== 'all' && counts[v.key] > 0 && (
                    <span className={l.segCount} data-tone={v.key === 'waiting' ? 'amber' : undefined}>
                      {counts[v.key]}
                    </span>
                  )}
                </>
              ),
            }))}
          />
        }
        action={
          <Link className="btn btn-primary" href="/org/events/new">
            <Icon name="plus" size={16} /> New event
          </Link>
        }
      />

      <section className={`card ${l.card}`} aria-label="Events">
        <div className={l.toolbar}>
          {usedTags.length > 0 ? (
            <TagMenu
              current={tag}
              items={[
                { label: 'All tags', href: href({ tag: null }), count: 0, color: '', on: !tag },
                ...usedTags.map((t) => ({ label: t.name, href: href({ tag: t.name }), count: t.uses, color: t.color, on: t.name.toLowerCase() === tag?.toLowerCase() })),
              ]}
            />
          ) : (
            <span />
          )}
          <span className={l.total}>
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {events.length === 0 ? (
          tag || show !== 'all' ? (
            <EmptyState
              icon="calendar"
              title={tag ? `No ${show === 'all' ? '' : `${views.find((v) => v.key === show)!.label.toLowerCase()} `}events tagged “${tag}”` : show === 'waiting' ? 'Nothing waiting for you' : `No ${views.find((v) => v.key === show)!.label.toLowerCase()} events`}
              hint={tag ? 'Add the tag when you create or edit an event.' : undefined}
              action={
                <Link className="btn" href="/org/events">
                  Show all events
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon="calendar-plus"
              title="No events yet"
              hint="Every verified hour starts with an event. Paste an invite or a flyer, or type it."
              action={
                <Link className="btn btn-primary" href="/org/events/new">
                  New event
                </Link>
              }
            />
          )
        ) : (
          <div className={l.scroll}>
            <table className={`t ${l.table}`}>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">When</th>
                  <th scope="col" className={`r ${l.narrowHide}`}>
                    People
                  </th>
                  <th scope="col" className={`r ${l.narrowHide}`}>
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
                  const state = stateOf(e);
                  const live = isLive(e);
                  const status =
                    state === 'verified' ? (
                      <Chip tone="green" icon="check">
                        Verified
                      </Chip>
                    ) : state === 'waiting' ? (
                      <Chip tone="amber" icon="clock">
                        Needs verification
                      </Chip>
                    ) : live ? (
                      <span className={`chip chip-green ${l.live}`}>
                        <span className={l.dot} aria-hidden /> Live now
                      </span>
                    ) : (
                      <Chip tone="ink">Upcoming</Chip>
                    );
                  const action =
                    !e.attested_at && (state === 'waiting' || e.is_practice) ? (
                      <Link className="btn btn-primary btn-sm" href={`/org/events/${e.id}/verify`}>
                        Verify
                      </Link>
                    ) : (
                      <Link className="btn btn-sm" href={`/org/events/${e.id}`}>
                        {live ? 'Open check-in' : 'Open'}
                      </Link>
                    );
                  const rowTags = tagMap.get(e.id) ?? [];
                  return (
                    <tr key={e.id} data-state={state}>
                      <td>
                        <div className={l.eventCell}>
                          <Link href={`/org/events/${e.id}`} className={l.thumbLink} tabIndex={-1} aria-hidden>
                            <Cover cover={coverFor({ title: e.title, activity: e.activity, tags: rowTags })} variant="thumb" className={l.thumb} sizes="44px" />
                          </Link>
                          <div className={l.eventText}>
                            <Link href={`/org/events/${e.id}`} className={l.title}>
                              {e.title}
                            </Link>
                            <p className={l.meta}>
                              {e.is_practice ? 'Practice · only you can see it' : ACTIVITY_LABEL[e.activity]}
                              {e.location ? ` · ${e.location}` : ''}
                            </p>
                            {rowTags.length > 0 && (
                              <span className={l.tags}>
                                {rowTags.map((t) => (
                                  <span key={t.id} className={`tag tag-${t.color}`}>
                                    {t.name}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={l.when}>
                        <span className={l.full}>
                          {fmtDay(e.starts_at)}
                          <span className={l.meta}>
                            {fmtTime(e.starts_at)} – {fmtTime(e.ends_at)}
                          </span>
                        </span>
                        <span className={l.short}>
                          {fmtDate(e.starts_at)}
                          <span className={l.meta}>{fmtTime(e.starts_at)}</span>
                        </span>
                      </td>
                      <td className={`num r ${l.narrowHide}`}>{e.people}</td>
                      <td className={`num r ${l.narrowHide}`}>{e.hours.toLocaleString()}</td>
                      <td className={l.status}>
                        {status}
                        <span className={l.inlineAction}>{action}</span>
                      </td>
                      <td className={`${l.narrowHide} ${l.actionCell}`}>{action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Stagger>
  );
}

export const instant = false;
