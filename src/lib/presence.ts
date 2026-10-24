import 'server-only';
import { sql } from './db';

// Leave-the-area check. While a volunteer's check-in page is open and they have
// opted in, it sends a location ping every few minutes. The server keeps no
// coordinates: only when the volunteer was first seen outside the event's
// radius and how far. After OUTSIDE_FOR_MIN minutes outside, that time becomes
// a *suggested* check-out the coordinator confirms or changes at verify.
// Nothing here checks anyone out.

export const OUTSIDE_FOR_MIN = 10;
export const MAX_ACCURACY_M = 150; // fixes vaguer than this are ignored, not guessed at
export const RADIUS_CHOICES = [100, 200, 400, 800] as const;

// Great-circle distance in metres.
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const validLatLng = (lat: unknown, lng: unknown) =>
  typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

export type PresenceResult =
  | { tracking: false; reason: 'not_checked_in' | 'no_site' | 'not_opted_in' }
  | { tracking: true; inside: boolean | null; distance_m: number | null; suggest_checkout: boolean; left_area_at: string | null };

type Row = {
  id: string;
  location_opt_in: boolean;
  outside_since: Date | null;
  left_area_at: Date | null;
  site_lat: number | null;
  site_lng: number | null;
  site_radius_m: number;
};

async function load(volunteerId: string, attendanceId: string) {
  const [row] = (await sql`
    select a.id, a.location_opt_in, a.outside_since, a.left_area_at, e.site_lat, e.site_lng, e.site_radius_m
    from attendance a join event e on e.id = a.event_id
    where a.id = ${attendanceId} and a.volunteer_id = ${volunteerId}
      and a.status = 'checked_in' and e.attested_at is null
  `) as unknown as Row[];
  return row ?? null;
}

// The volunteer turns the check on or off for this check-in. Off clears everything.
export async function setLocationOptIn(volunteerId: string, attendanceId: string, on: boolean) {
  const row = await load(volunteerId, attendanceId);
  if (!row) return false;
  await sql`
    update attendance set location_opt_in = ${on},
      last_ping_at = case when ${on} then last_ping_at else null end,
      outside_since = case when ${on} then outside_since else null end,
      left_area_at = case when ${on} then left_area_at else null end,
      left_area_m = case when ${on} then left_area_m else null end
    where id = ${attendanceId}
  `;
  return true;
}

export async function recordPresence(
  volunteerId: string,
  attendanceId: string,
  fix: { lat: number; lng: number; accuracy_m: number },
  at = new Date(),
): Promise<PresenceResult> {
  const row = await load(volunteerId, attendanceId);
  if (!row) return { tracking: false, reason: 'not_checked_in' };
  if (!row.location_opt_in) return { tracking: false, reason: 'not_opted_in' };
  if (row.site_lat == null || row.site_lng == null) return { tracking: false, reason: 'no_site' };

  const suggestion = (r: { left_area_at: Date | null }) => (r.left_area_at ? new Date(r.left_area_at).toISOString() : null);

  // Too vague to say inside or outside: note the ping, change nothing else.
  if (!(fix.accuracy_m >= 0) || fix.accuracy_m > MAX_ACCURACY_M) {
    await sql`update attendance set last_ping_at = ${at} where id = ${row.id}`;
    return { tracking: true, inside: null, distance_m: null, suggest_checkout: !!row.left_area_at, left_area_at: suggestion(row) };
  }

  const d = distanceM({ lat: row.site_lat, lng: row.site_lng }, fix);
  // Only "outside" when the whole uncertainty circle is outside the radius, so a
  // poor fix near the edge (creek beds, tree cover) never counts against anyone.
  const outside = d - fix.accuracy_m > row.site_radius_m;

  if (!outside) {
    // Back inside, or never left: drop any pending suggestion.
    await sql`
      update attendance set last_ping_at = ${at}, outside_since = null, left_area_at = null, left_area_m = null
      where id = ${row.id}
    `;
    return { tracking: true, inside: true, distance_m: Math.round(d), suggest_checkout: false, left_area_at: null };
  }

  const since = row.outside_since ? new Date(row.outside_since) : at;
  const longEnough = at.getTime() - since.getTime() >= OUTSIDE_FOR_MIN * 60_000;
  const [updated] = (await sql`
    update attendance set
      last_ping_at = ${at},
      outside_since = ${since},
      left_area_at = case when ${longEnough} then coalesce(left_area_at, ${since}) else left_area_at end,
      left_area_m = case when ${longEnough} then ${Math.round(d)} else left_area_m end
    where id = ${row.id}
    returning left_area_at
  `) as unknown as { left_area_at: Date | null }[];
  return { tracking: true, inside: false, distance_m: Math.round(d), suggest_checkout: !!updated.left_area_at, left_area_at: suggestion(updated) };
}

// Coordinator sets (or clears) the site on the day, usually by standing at it.
export async function setEventSite(orgId: string, eventId: string, site: { lat: number; lng: number; radius_m: number } | null) {
  const [row] = site
    ? await sql`
        update event set site_lat = ${site.lat}, site_lng = ${site.lng}, site_radius_m = ${site.radius_m}
        where id = ${eventId} and org_id = ${orgId} and attested_at is null
        returning site_lat, site_lng, site_radius_m`
    : await sql`
        update event set site_lat = null, site_lng = null
        where id = ${eventId} and org_id = ${orgId} and attested_at is null
        returning site_lat, site_lng, site_radius_m`;
  return row ?? null;
}
