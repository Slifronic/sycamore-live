import 'server-only';
import { cacheLife } from 'next/cache';
import { sql } from './db';
import { isSlug, httpsUrl, type Category } from './opportunity-rules';

export * from './opportunity-rules';

// The public opportunities board (/opportunities): two kinds of thing, kept apart.
//   1. Events on SycaMore: upcoming public events whose hours are scanned in
//      and out and verified by the organization. Only organizations SycaMore
//      has reviewed appear here (see boardEvents).
//   2. Public listings: curated rows in `opportunity`, at organizations that
//      mostly don't use SycaMore. Each links out to the organization's own
//      page; SycaMore records nothing there.
// Nothing here reads a cookie or knows who is looking.

export type Opportunity = {
  slug: string;
  org_name: string;
  title: string;
  summary: string;
  org_url: string | null;
  city: string;
  category: Category;
  schedule: string | null;
  min_age: number | null;
  min_age_note: string | null;
  group_friendly: boolean | null;
  remote: boolean;
  verified_on: string; // YYYY-MM-DD
};

/**
 * Every listed public listing, A to Z by organization. Cached for a few
 * minutes: the board is public and the rows change only when someone runs the
 * seed, so a crawler can't turn page views into database load. The outbound
 * url is left out on purpose; pages link to /opportunities/go/<slug>.
 * If the table isn't there yet (a deploy before its migration), the board
 * shows no listings instead of an error page.
 */
export async function listedOpportunities(): Promise<Opportunity[]> {
  'use cache';
  cacheLife('minutes');
  try {
    return (await sql`
      select slug, org_name, title, summary, org_url, city, category, schedule, min_age, min_age_note, group_friendly, remote,
             to_char(verified_on, 'YYYY-MM-DD') as verified_on
      from opportunity where status = 'listed'
      order by lower(org_name), lower(title)`) as unknown as Opportunity[];
  } catch (e) {
    console.error('opportunities: could not load listings', e);
    return [];
  }
}

/** One listed listing by its slug; null for anything unknown or hidden. */
export async function opportunityBySlug(slug: string): Promise<Opportunity | null> {
  if (!isSlug(slug)) return null;
  return (await listedOpportunities()).find((o) => o.slug === slug) ?? null;
}

export type BoardEvent = {
  slug: string;
  title: string;
  starts_at: string; // ISO
  ends_at: string;
  place: string | null;
  org_name: string;
  org_city: string | null;
  category: Category;
};

type Activity = 'general' | 'planting' | 'logistics' | 'outreach' | 'education';
// The coordinator's activity for the event, in the board's kinds of work.
const ACTIVITY_CATEGORY: Record<Activity, Category> = { general: 'other', planting: 'tree_planting', logistics: 'logistics', outreach: 'other', education: 'tutoring' };

/**
 * Upcoming public events for the signed-out board. The same rules as
 * Discover's upcomingListings (not practice, not verified, open, not ended)
 * plus one more: the organization has been reviewed (org.reviewed_at). Anyone
 * can create an organization, and this page is public and indexable, so an
 * unreviewed one can't use it to put an event in front of strangers, many of
 * them under 18. Its events still reach people the usual ways: the link the
 * coordinator shares (/e/<slug>) and signed-in Discover.
 */
export async function boardEvents(): Promise<BoardEvent[]> {
  'use cache';
  cacheLife('minutes');
  try {
    const rows = (await sql`
      select e.public_slug as slug, e.title, e.starts_at, e.ends_at, coalesce(e.place_name, e.location) as place, e.activity,
             o.name as org_name, o.city as org_city
      from event e join org o on o.id = e.org_id
      where not e.is_practice and e.attested_at is null and e.status = 'open' and e.ends_at > now()
        and o.reviewed_at is not null
      order by e.starts_at
      limit 60`) as unknown as (Omit<BoardEvent, 'starts_at' | 'ends_at' | 'category'> & { starts_at: Date; ends_at: Date; activity: Activity })[];
    return rows.map(({ activity, ...r }) => ({
      ...r,
      starts_at: new Date(r.starts_at).toISOString(),
      ends_at: new Date(r.ends_at).toISOString(),
      category: ACTIVITY_CATEGORY[activity] ?? 'other',
    }));
  } catch (e) {
    console.error('opportunities: could not load events', e);
    return [];
  }
}

/**
 * Where /opportunities/go/<slug> sends the visitor: the stored link of a
 * listed listing, and nothing else. `count` adds one to outbound_clicks.
 * Returns null for an unknown or hidden slug, or a stored value that isn't
 * https (the table's CHECK already refuses those; this is the second lock).
 */
export async function visitOpportunity(slug: string, count = true): Promise<string | null> {
  if (!isSlug(slug)) return null;
  const [row] = (
    count
      ? await sql`update opportunity set outbound_clicks = outbound_clicks + 1 where slug = ${slug} and status = 'listed' returning url`
      : await sql`select url from opportunity where slug = ${slug} and status = 'listed'`
  ) as unknown as { url: string }[];
  return row ? httpsUrl(row.url) : null;
}
