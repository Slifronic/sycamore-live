import 'server-only';
import { sql } from './db';
import { appUrl, tagsForEvents, type Tag } from './event-intake';
import { buildIcs, googleCalendarLink, outlookCalendarLink, type FeedEvent } from './ical';
import { appleDirections, googleDirections, placeLine } from './place-links';
import { fmtDay, fmtTime } from './format';
import type { EventRow, Org } from './types';

// The volunteer-facing side of an event: its public page, its calendar
// entry, the org's calendar feed, and the announcement text to share.
// Practice events never appear here.

export type PublicEvent = EventRow & { org_name: string; org_phone: string; org_email: string; tags: Tag[] };

export async function publicEvent(slug: string): Promise<PublicEvent | null> {
  if (!/^[0-9a-f]{10}$/.test(slug)) return null;
  const [row] = (await sql`
    select e.*, o.name as org_name, o.contact_phone as org_phone, o.contact_email as org_email
    from event e join org o on o.id = e.org_id
    where e.public_slug = ${slug} and not e.is_practice`) as unknown as PublicEvent[];
  if (!row) return null;
  row.tags = (await tagsForEvents([row.id])).get(row.id) ?? [];
  return row;
}

export const eventPageUrl = (slug: string) => `${appUrl()}/e/${slug}`;

const where = (e: EventRow) => ({ name: e.place_name ?? e.location, address: e.place_address, lat: e.place_lat, lng: e.place_lng, text: e.location });

export function eventLinks(e: EventRow) {
  const location = placeLine(where(e));
  const details = [e.volunteer_notes, `Event page: ${eventPageUrl(e.public_slug)}`].filter(Boolean).join('\n\n');
  const cal = { title: e.title, start: new Date(e.starts_at), end: new Date(e.ends_at), location, details };
  return {
    page: eventPageUrl(e.public_slug),
    ics: `${eventPageUrl(e.public_slug)}/ics`,
    google: googleCalendarLink(cal),
    outlook: outlookCalendarLink(cal),
    directions: googleDirections(where(e)),
    apple: appleDirections(where(e)),
    location,
  };
}

export function toFeedEvent(e: EventRow & { tags?: Tag[] }, orgName: string): FeedEvent {
  const l = eventLinks(e);
  return {
    uid: `${e.id}@sycamore-live`,
    title: e.title,
    start: new Date(e.starts_at),
    end: new Date(e.ends_at),
    location: l.location,
    geo: e.place_lat != null && e.place_lng != null ? { lat: e.place_lat, lng: e.place_lng } : null,
    description: [e.volunteer_notes, e.goal_text ? `Goal: ${e.goal_text}` : null, `Hosted by ${orgName}. Check in with the QR code at the sign-in table.`, l.page].filter(Boolean).join('\n\n'),
    url: l.page,
    categories: e.tags?.map((t) => t.name),
  };
}

export function eventIcs(e: PublicEvent): string {
  return buildIcs(e.title, [toFeedEvent(e, e.org_name)]);
}

/** The org's whole calendar (60 days back, everything ahead), optionally one tag. */
export async function orgFeed(token: string, tag: string | null): Promise<{ name: string; body: string } | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const [org] = (await sql`select id, name from org where calendar_token = ${token}`) as unknown as Pick<Org, 'id' | 'name'>[];
  if (!org) return null;
  const events = (await sql`
    select e.* from event e
    where e.org_id = ${org.id} and not e.is_practice and e.ends_at > now() - interval '60 days'
      and (${tag}::text is null or exists (
        select 1 from event_tag et join tag t on t.id = et.tag_id where et.event_id = e.id and lower(t.name) = lower(${tag}::text)))
    order by e.starts_at`) as unknown as EventRow[];
  const tags = await tagsForEvents(events.map((e) => e.id));
  const name = tag ? `${org.name} · ${tag}` : org.name;
  return { name, body: buildIcs(name, events.map((e) => toFeedEvent({ ...e, tags: tags.get(e.id) ?? [] }, org.name)), { refreshHours: 6 }) };
}

export function feedUrls(org: Pick<Org, 'calendar_token'>, tag?: string | null) {
  const https = `${appUrl()}/cal/${org.calendar_token}.ics${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`;
  const webcal = https.replace(/^https?:\/\//, 'webcal://');
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent('Volunteer events')}`,
  };
}

/** The announcement for a group chat, a text or an email. Plain text, short lines, one link. */
export function announcement(e: EventRow, orgName: string): string {
  const l = eventLinks(e);
  return [
    `🌱 ${e.title}`,
    `${fmtDay(e.starts_at)}, ${fmtTime(e.starts_at)} to ${fmtTime(e.ends_at)}`,
    l.location ? `📍 ${l.location}` : null,
    e.volunteer_notes ? `\n${e.volunteer_notes}` : null,
    `\nDetails, directions and add to calendar: ${l.page}`,
    `Hours are verified by ${orgName}: scan the QR code at the sign-in table when you arrive.`,
  ]
    .filter(Boolean)
    .join('\n');
}
