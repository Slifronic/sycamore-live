import 'server-only';
import type { Metadata } from 'next';
import { sql } from './db';
import { currentOrg } from './session';
import { getEvent } from './org-data';
import { isUuid } from './ids';
import { currentVolunteerId } from './vol-session';
import { volunteerRecord } from './vol-data';
import { badgeByKey, type BadgeKey } from './badges';

// Titles and descriptions for private pages that name their subject: "Verify
// {event}" rather than "Verify hours". Each lookup is scoped exactly like its
// page (the coordinator's org, the volunteer's own rows, upcoming public
// listings), and falls back to a generic title when the row isn't the viewer's,
// so a title never names something the page itself would 404 on.

type Words = { title: string; description: string };

/** Coordinator pages about one event. */
export async function orgEventMeta(id: string, make: (title: string) => Words, fallback: Words): Promise<Metadata> {
  const org = await currentOrg();
  const e = org && isUuid(id) ? await getEvent(org.id, id) : null;
  return e ? make(e.title) : fallback;
}

/** The hour letter: named for the volunteer it's about. */
export async function letterMeta(id: string): Promise<Metadata> {
  const org = await currentOrg();
  // Only a volunteer with verified hours at this organization, the same rule as the page.
  const [v] =
    org && isUuid(id)
      ? ((await sql`
          select v.name from volunteer v
          where v.id = ${id} and exists (
            select 1 from attendance a join event e on e.id = a.event_id
            where a.volunteer_id = v.id and e.org_id = ${org.id} and a.status = 'attested' and not e.is_practice)`) as unknown as { name: string }[])
      : [];
  return v
    ? { title: `Hour letter · ${v.name}`, description: `A printable letter of ${v.name}’s verified hours with ${org!.name}, with the fields schools ask for.` }
    : { title: 'Hour letter', description: 'A printable letter of one volunteer’s verified hours, with the fields schools ask for.' };
}

/** A volunteer's own record. */
export async function recordMeta(id: string): Promise<Metadata> {
  const vid = await currentVolunteerId();
  const r = vid && isUuid(id) ? await volunteerRecord(vid, id) : null;
  return r
    ? { title: `${r.event.title} · Record`, description: `Your record from ${r.org.name}: share a link anyone can check, print it, or draft a resume line from it.` }
    : { title: 'Record', description: 'One verified record: share a link anyone can check, print it, or draft a resume line from it.' };
}

/** A badge, by its key. */
export function badgeMeta(key: string): Metadata {
  const b = badgeByKey[key as BadgeKey];
  return b
    ? { title: `${b.name} badge`, description: `The ${b.name} badge: its rule, your progress, and the signed certificate once an organization signs it.` }
    : { title: 'Badge', description: 'One badge: its rule, your progress, and the signed certificate once an organization signs it.' };
}

/** A Discover listing, by the event's public slug. */
export async function discoverMeta(slug: string): Promise<Metadata> {
  const [e] = /^[0-9a-f]{10}$/.test(slug)
    ? ((await sql`
        select e.title, o.name as org_name from event e join org o on o.id = e.org_id
        where e.public_slug = ${slug} and not e.is_practice and e.attested_at is null and e.status = 'open' and e.ends_at > now()`) as unknown as { title: string; org_name: string }[])
    : [];
  return e
    ? { title: `${e.title} · Discover`, description: `${e.title} with ${e.org_name}: why it fits what you want to do, when and where it is, and how check-in works.` }
    : { title: 'Event details', description: 'One upcoming event: why it fits what you want to do, when and where it is, and how check-in works.' };
}
