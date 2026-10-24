import 'server-only';
import { sql } from './db';
import { tagsForEvents } from './event-intake';
import { isUuid } from './ids';
import { toListing, type EventListingRow, type Listing } from './discover/listings';
import { VolError } from './vol-data';

// Discover's data: upcoming public events from every organization, mapped into
// the engine's listing shape, and the volunteer's saved list. Practice events
// and verified (closed) events never appear. Scoring happens in the browser
// with src/lib/discover; the volunteer's resume text never comes here.

type Row = Omit<EventListingRow, 'tags' | 'starts_at' | 'ends_at'> & { starts_at: Date; ends_at: Date };

export async function upcomingListings(): Promise<Listing[]> {
  const rows = (await sql`
    select e.id, e.public_slug as slug, e.title, e.starts_at, e.ends_at, e.activity,
           coalesce(e.place_name, e.location) as place, e.place_address as address, e.volunteer_notes as notes, e.goal_text as goal,
           o.name as org_name, o.city as org_city, o.kind as org_kind
    from event e join org o on o.id = e.org_id
    where not e.is_practice and e.attested_at is null and e.status = 'open' and e.ends_at > now()
    order by e.starts_at
    limit 200`) as unknown as Row[];
  const tags = await tagsForEvents(rows.map((r) => r.id));
  return rows.map((r) =>
    toListing({ ...r, starts_at: new Date(r.starts_at).toISOString(), ends_at: new Date(r.ends_at).toISOString(), tags: (tags.get(r.id) ?? []).map((t) => t.name) }),
  );
}

export async function savedEventIds(volunteerId: string): Promise<string[]> {
  const rows = (await sql`select event_id from saved_event where volunteer_id = ${volunteerId} order by saved_at`) as unknown as { event_id: string }[];
  return rows.map((r) => r.event_id);
}

/** Save or unsave one upcoming public event. Only the event id is stored. */
export async function setSaved(volunteerId: string, eventId: unknown, saved: unknown): Promise<boolean> {
  if (typeof eventId !== 'string' || !isUuid(eventId)) throw new VolError('Pick an event to save.', 400);
  if (typeof saved !== 'boolean') throw new VolError('Send saved: true or false.', 400);
  if (!saved) {
    await sql`delete from saved_event where volunteer_id = ${volunteerId} and event_id = ${eventId}`;
    return false;
  }
  const [e] = (await sql`select id from event where id = ${eventId} and not is_practice`) as unknown as { id: string }[];
  if (!e) throw new VolError('No event with that id.', 404);
  await sql`insert into saved_event (volunteer_id, event_id) values (${volunteerId}, ${eventId}) on conflict do nothing`;
  return true;
}
