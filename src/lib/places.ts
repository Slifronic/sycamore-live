import 'server-only';
import { finalUrl, FetchBlocked, UA } from './safe-fetch';
import type { Place } from './place-links';

// Turning what a coordinator has (a place name, an address, a Google Maps or
// Apple Maps link, "37.33, -121.89") into a pin. Search uses OpenStreetMap's
// Nominatim, which needs no key; its policy allows about one request a second,
// so results are cached and requests are spaced out.

const cache = new Map<string, { at: number; value: Place[] }>();
let lastCall = 0;

async function nominatim(path: string, params: Record<string, string>): Promise<unknown> {
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const q = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', ...params });
  const res = await fetch(`https://nominatim.openstreetmap.org/${path}?${q}`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new FetchBlocked(`Map search is busy (error ${res.status}). Try again in a moment.`);
  return res.json();
}

type NominatimHit = { name?: string; display_name: string; lat: string; lon: string; address?: Record<string, string> };

function toPlace(h: NominatimHit, url: string | null = null): Place {
  const a = h.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const city = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county;
  const short = [street, city, a.state ? `${a.state === 'California' ? 'CA' : a.state}${a.postcode ? ` ${a.postcode}` : ''}` : null].filter(Boolean).join(', ');
  const name = h.name || h.display_name.split(',')[0];
  return { name, address: short || h.display_name, lat: Number(h.lat), lng: Number(h.lon), url };
}

/** Search places by name or address, biased to the Bay Area but not limited to it. */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim().slice(0, 200);
  if (q.length < 3) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
  const rows = (await nominatim('search', { q, limit: '6', countrycodes: 'us', viewbox: '-122.6,38.0,-121.5,37.0' })) as NominatimHit[];
  const value = rows.map((r) => toPlace(r));
  cache.set(key, { at: Date.now(), value });
  return value;
}

export async function reversePlace(lat: number, lng: number): Promise<Place | null> {
  const row = (await nominatim('reverse', { lat: String(lat), lon: String(lng), zoom: '17' })) as NominatimHit & { error?: string };
  if (!row || row.error) return null;
  return { ...toPlace(row), lat, lng };
}

const COORDS = /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/;

const okLatLng = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

const MAP_HOSTS = (h: string) =>
  /(^|\.)google\.[a-z.]+$/.test(h) || h === 'maps.app.goo.gl' || h === 'goo.gl' || h === 'maps.apple.com' || h === 'maps.apple' || h.endsWith('openstreetmap.org');

/**
 * Read a pin out of a maps link or typed coordinates. Short links
 * (maps.app.goo.gl) are expanded first. Returns null when the text isn't a
 * map link at all, so the caller can fall back to a search.
 */
export async function placeFromText(text: string): Promise<Place | null> {
  const raw = text.trim();
  const bare = COORDS.exec(raw);
  if (bare && !/^https?:/i.test(raw)) {
    const lat = Number(bare[1]);
    const lng = Number(bare[2]);
    if (!okLatLng(lat, lng)) return null;
    return (await reversePlace(lat, lng).catch(() => null)) ?? { name: 'Dropped pin', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng, url: null };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (!MAP_HOSTS(host)) return null;
  // google.com hosts calendars and more too: only /maps paths (or maps.google.*) are map links.
  if (/(^|\.)google\.[a-z.]+$/.test(host) && !host.startsWith('maps.') && !url.pathname.startsWith('/maps')) return null;
  let full = url;
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') full = new URL(await finalUrl(raw, { allowHosts: MAP_HOSTS }));
  const s = decodeURIComponent(full.toString());

  // Google: /@lat,lng,zoom, the !3d!4d place marker, or ?q= / ?query= / ?ll= / ?destination=.
  const marker = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(s);
  const at = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(s);
  const p = full.searchParams;
  const qv = p.get('q') ?? p.get('query') ?? p.get('ll') ?? p.get('destination') ?? p.get('daddr') ?? p.get('sll') ?? '';
  const qCoords = COORDS.exec(qv);
  const placeName = /\/place\/([^/@]+)/.exec(full.pathname)?.[1]?.replace(/\+/g, ' ');
  const coords = marker ?? qCoords ?? at;
  const label = decodeURIComponent((placeName ?? (qCoords ? '' : qv) ?? '').replace(/\+/g, ' ')).trim();

  if (coords) {
    const lat = Number(coords[1]);
    const lng = Number(coords[2]);
    if (!okLatLng(lat, lng)) return null;
    const rev = await reversePlace(lat, lng).catch(() => null);
    return { name: label || rev?.name || 'Dropped pin', address: rev?.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng, url: raw };
  }
  if (label) {
    const [first] = await searchPlaces(label);
    if (first) return { ...first, name: placeName ? label : first.name, url: raw };
  }
  throw new FetchBlocked('That map link doesn’t include a location. Open the place in Maps, tap Share, and paste that link.');
}
