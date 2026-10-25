import Link from 'next/link';
import { connection } from 'next/server';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { listTags, tagsForEvents, type Tag } from '@/lib/event-intake';
import { feedUrls } from '@/lib/event-public';
import { utcToPacific, zonedToUtc } from '@/lib/tz';
import { fmtTime, requestNow } from '@/lib/format';
import type { EventRow } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { TagMenu } from '../TagMenu';
import { Subscribe } from './Subscribe';
import s from './calendar.module.css';

export const metadata = { title: 'Calendar' };

// The org's events on a month grid (an agenda list on phones), filtered by
// tag, plus the subscribe links that put them in Google, Apple or Outlook.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymdOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

export default async function CalendarPage({ searchParams }: PageProps<'/org/events/calendar'>) {
  await connection();
  const org = await requireOrg();
  const sp = await searchParams;
  const tag = typeof sp.tag === 'string' ? sp.tag.slice(0, 32) : null;
  const today = utcToPacific(new Date()).ymd;
  const month = typeof sp.m === 'string' && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells = Math.ceil((lead + daysIn) / 7) * 7;
  const gridStart = ymdOf(y, m, 1 - lead);
  const gridEnd = ymdOf(y, m, cells - lead + 1);

  const events = (await sql`
    select e.* from event e
    where e.org_id = ${org.id} and not e.is_practice
      and e.starts_at >= ${zonedToUtc(gridStart, '00:00')} and e.starts_at < ${zonedToUtc(gridEnd, '00:00')}
      and (${tag}::text is null or exists (
        select 1 from event_tag et join tag t on t.id = et.tag_id where et.event_id = e.id and lower(t.name) = lower(${tag}::text)))
    order by e.starts_at`) as unknown as EventRow[];
  const [tags, tagMap] = await Promise.all([listTags(org.id), tagsForEvents(events.map((e) => e.id))]);
  const byDay = new Map<string, (EventRow & { tags: Tag[] })[]>();
  for (const e of events) {
    const d = utcToPacific(e.starts_at).ymd;
    byDay.set(d, [...(byDay.get(d) ?? []), { ...e, tags: tagMap.get(e.id) ?? [] }]);
  }

  const shift = (k: number) => {
    const d = new Date(Date.UTC(y, m - 1 + k, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const href = (mm: string | null, t: string | null) => {
    const q = new URLSearchParams();
    if (mm) q.set('m', mm);
    if (t) q.set('tag', t);
    const str = q.toString();
    return `/org/events/calendar${str ? `?${str}` : ''}`;
  };
  const title = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const feeds = feedUrls(org, tag);
  const now = requestNow();
  const days = Array.from({ length: cells }, (_, i) => ymdOf(y, m, i - lead + 1));
  const agenda = days.filter((d) => d.slice(0, 7) === month && byDay.has(d));

  const chip = (e: EventRow & { tags: Tag[] }) => {
    const state = e.attested_at ? s.done : new Date(e.ends_at).getTime() < now ? s.needs : '';
    return (
      <Link key={e.id} href={`/org/events/${e.id}`} className={`${s.ev} ${state}`} title={`${e.title} · ${fmtTime(e.starts_at)} to ${fmtTime(e.ends_at)}${e.location ? ` · ${e.location}` : ''}`}>
        <span className={s.evTime}>{fmtTime(e.starts_at).replace(':00', '').replace(' ', '').toLowerCase()}</span>
        <span className={s.evTitle}>{e.title}</span>
        {e.attested_at && (
          <span className={s.evDone}>
            <Icon name="check" size={12} strokeWidth={2.5} />
            <span className="sr-only">Verified</span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <Stagger className="page">
      <PageHeader
        eyebrow="Run events"
        title="Calendar"
        controls={
          <div className={s.monthNav}>
            <Link className={s.navBtn} href={href(shift(-1), tag)} aria-label="Previous month">
              <Icon name="chevron-left" size={16} />
            </Link>
            <span className={s.month}>{title}</span>
            <Link className={s.navBtn} href={href(shift(1), tag)} aria-label="Next month">
              <Icon name="chevron-right" size={16} />
            </Link>
            {month !== today.slice(0, 7) && (
              <Link className="btn btn-sm btn-quiet" href={href(null, tag)}>
                Today
              </Link>
            )}
          </div>
        }
        action={
          <>
            {tags.some((t) => t.uses > 0) && (
              <TagMenu
                current={tag}
                items={[
                  { label: 'All tags', href: href(month, null), count: 0, color: '', on: !tag },
                  ...tags.filter((t) => t.uses > 0).map((t) => ({ label: t.name, href: href(month, t.name), count: t.uses, color: t.color, on: t.name.toLowerCase() === tag?.toLowerCase() })),
                ]}
              />
            )}
            <Subscribe feeds={feeds} tag={tag} />
          </>
        }
      />

      <div className={`card ${s.grid}`} role="grid" aria-label={title}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={s.dow} role="columnheader">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const out = d.slice(0, 7) !== month;
          return (
            <div key={d} role="gridcell" className={`${s.day} ${out ? s.out : ''} ${d === today ? s.today : ''}`}>
              <div className={s.dayHead}>
                <span className={s.num}>{Number(d.slice(8))}</span>
                {!out && d >= today && (
                  <Link className={s.add} href={`/org/events/new?date=${d}`} aria-label={`New event on ${d}`}>
                    <Icon name="plus" size={14} />
                  </Link>
                )}
              </div>
              <div className={s.evs}>
                {list.slice(0, 3).map(chip)}
                {list.length > 3 && <span className={s.more}>+{list.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`card ${s.agenda}`}>
        {agenda.length === 0 ? (
          <EmptyState compact icon="calendar" title={`No events in ${title}`} action={<Link className="btn btn-sm" href="/org/events/new">New event</Link>} />
        ) : (
          agenda.map((d) => (
            <div key={d} className={s.agendaDay}>
              <p className="eyebrow">{new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
              {(byDay.get(d) ?? []).map(chip)}
            </div>
          ))
        )}
      </div>
    </Stagger>
  );
}

export const instant = false;
