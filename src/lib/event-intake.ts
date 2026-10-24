import 'server-only';
import { sql } from './db';
import { parseIcs, parseCalendarLink, type IcsEvent } from './ical';
import { fetchText, FetchBlocked } from './safe-fetch';
import { placeFromText } from './places';
import { draftFromMaterial, IntakeError } from './intake-ai';
import { utcToPacific } from './tz';
import type { IntakeDraft, IntakeResult, IntakeSource } from './intake-types';
import type { Activity } from './types';
import type { Place } from './place-links';

// Event intake: whatever the coordinator already has (a calendar invite, a
// calendar's iCal address, an "add to calendar" link, an event page, a pasted
// message, a flyer photo, a past event) becomes a filled-in New event form.

export type TagColor = 'sap' | 'sky' | 'sun' | 'clay' | 'plum' | 'stone';
export type Tag = { id: string; name: string; color: TagColor };
export const TAG_COLORS: TagColor[] = ['sap', 'sky', 'sun', 'clay', 'plum', 'stone'];

// ---------- turning sources into drafts ----------

function guessActivity(text: string): Activity {
  const t = text.toLowerCase();
  if (/\b(plant|tree|garden|restor|creek|habitat|weed|mulch|cleanup|clean-up)/.test(t)) return 'planting';
  if (/\b(sort|pack|pantry|food bank|food drive|distribution|warehouse|meal)/.test(t)) return 'logistics';
  if (/\b(tabl|canvass|outreach|booth|flyer|campaign|registration drive)/.test(t)) return 'outreach';
  if (/\b(tutor|mentor|class|workshop|teach|reading)/.test(t)) return 'education';
  return 'general';
}

function cleanNotes(description: string | null): string | null {
  if (!description) return null;
  // Calendar descriptions carry video-call boilerplate; keep the human part.
  const cut = description.split(/\n\s*-::~|\n-{3,}|\n_{3,}|Join (with )?Google Meet|Join Zoom Meeting|Microsoft Teams meeting/i)[0];
  const text = cut.replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text ? text.slice(0, 600) : null;
}

function fromIcs(ev: IcsEvent, source: IntakeSource, label: string): IntakeDraft {
  const s = utcToPacific(ev.start);
  const e = utcToPacific(ev.end);
  const check: string[] = [];
  const warnings: string[] = [];
  if (ev.allDay) {
    check.push('start', 'end');
    warnings.push('This is an all-day event in the calendar. Set the hours people actually serve.');
  } else if (s.ymd !== e.ymd) {
    check.push('end');
    warnings.push('It runs past midnight in the calendar. Check the end time.');
  }
  const place: Place | null = ev.geo ? { name: ev.location?.split(',')[0] ?? 'Event location', address: ev.location ?? '', lat: ev.geo.lat, lng: ev.geo.lng, url: null } : null;
  return {
    title: ev.title.slice(0, 120),
    date: s.ymd,
    start: ev.allDay ? '09:00' : s.hhmm,
    end: ev.allDay ? '12:00' : s.ymd === e.ymd ? e.hhmm : null,
    location: ev.location,
    place,
    notes: cleanNotes(ev.description),
    goal: null,
    activity: guessActivity(`${ev.title} ${ev.description ?? ''}`),
    tags: [],
    source,
    source_uid: ev.uid,
    source_label: label,
    check,
    warnings,
  };
}

/** Event pages (Eventbrite, Meetup, most org websites) describe themselves in schema.org JSON-LD. */
function fromJsonLd(html: string): IntakeDraft | null {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const b of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(b);
    } catch {
      continue;
    }
    const items = (Array.isArray(data) ? data : [data]).flatMap((d) => ((d as { '@graph'?: unknown[] })['@graph'] ?? [d]) as Record<string, unknown>[]);
    const ev = items.find((d) => /Event$/.test(String(d['@type'] ?? '')));
    if (!ev || !ev.startDate) continue;
    const start = new Date(String(ev.startDate));
    if (Number.isNaN(start.getTime())) continue;
    const end = ev.endDate ? new Date(String(ev.endDate)) : null;
    const loc = ev.location as Record<string, unknown> | undefined;
    const addr = loc?.address as Record<string, string> | string | undefined;
    const address = typeof addr === 'string' ? addr : addr ? [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(', ') : '';
    const geo = loc?.geo as { latitude?: number | string; longitude?: number | string } | undefined;
    const ics: IcsEvent = {
      uid: typeof ev.url === 'string' ? ev.url : null,
      title: String(ev.name ?? 'Untitled event'),
      start,
      end: end && !Number.isNaN(end.getTime()) ? end : new Date(start.getTime() + 3 * 3_600_000),
      allDay: /^\d{4}-\d{2}-\d{2}$/.test(String(ev.startDate)),
      location: [loc?.name, address].filter(Boolean).join(', ') || null,
      description: typeof ev.description === 'string' ? ev.description : null,
      url: null,
      geo: geo?.latitude != null && geo?.longitude != null ? { lat: Number(geo.latitude), lng: Number(geo.longitude) } : null,
      status: null,
    };
    const d = fromIcs(ics, 'link', 'Event page');
    if (!ev.endDate) {
      d.end = null;
      d.check.push('end');
    }
    return d;
  }
  return null;
}

const htmlToText = (html: string) =>
  html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function upcoming(events: IcsEvent[], source: IntakeSource, label: string, limit = 30): IntakeDraft[] {
  const now = Date.now();
  const future = events.filter((e) => e.end.getTime() >= now - 3_600_000);
  const pick = future.length ? future.slice(0, limit) : events.slice(-5).reverse();
  return pick.map((e) => fromIcs(e, source, label));
}

async function markDuplicates(orgId: string, drafts: IntakeDraft[]) {
  const uids = drafts.map((d) => d.source_uid).filter((u): u is string => !!u);
  if (!uids.length) return drafts;
  const rows = (await sql`select source_uid, title, starts_at from event where org_id = ${orgId} and source_uid = any(${uids})`) as unknown as { source_uid: string; title: string; starts_at: Date }[];
  for (const d of drafts) {
    const hit = rows.find((r) => r.source_uid === d.source_uid && utcToPacific(r.starts_at).ymd === d.date);
    if (hit) d.warnings.unshift(`You already created this event (“${hit.title}”). Creating it again makes a second copy.`);
  }
  return drafts;
}

const FEED_HINT = 'Google Calendar: Settings → your calendar → “Secret address in iCal format”. Apple Calendar: share the calendar as a public calendar. Outlook: Settings → Shared calendars → Publish → ICS link.';

/** A pasted URL: an "add to calendar" link, a calendar feed, a maps link or an event page. */
async function fromUrl(orgId: string, raw: string): Promise<IntakeResult> {
  const url = raw.trim().replace(/^webcals?:\/\//i, 'https://');
  const link = parseCalendarLink(url);
  if (link) {
    const ics: IcsEvent = { uid: null, title: link.title, start: link.start, end: link.end, allDay: false, location: link.location, description: link.details, url: null, geo: null, status: null };
    return { kind: 'drafts', drafts: [fromIcs(ics, 'link', 'Calendar link')] };
  }
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (host === 'calendar.google.com' && /eid=|\/event\b/.test(url)) {
    return { kind: 'error', error: `Google keeps single-event links private, so they can’t be read here. Paste the invite text, drop in the .ics file from the invite email, or paste your calendar’s secret iCal address. ${FEED_HINT}` };
  }
  try {
    const place = await placeFromText(url);
    if (place) return { kind: 'place', place };
  } catch (e) {
    if (e instanceof FetchBlocked) return { kind: 'error', error: e.message };
    throw e;
  }
  const { text, contentType } = await fetchText(url, { accept: 'text/calendar, text/html;q=0.9, */*;q=0.5' });
  if (/BEGIN:VCALENDAR/i.test(text)) {
    const events = parseIcs(text, { from: new Date(Date.now() - 86_400_000), to: new Date(Date.now() + 120 * 86_400_000) });
    if (!events.length) return { kind: 'error', error: 'That calendar has no events in the next four months.' };
    return { kind: 'drafts', drafts: await markDuplicates(orgId, upcoming(events, 'feed', 'Your calendar')), note: 'Pick the event to bring in. Only the next four months are shown.' };
  }
  if (/html/i.test(contentType) || /<html/i.test(text)) {
    const ld = fromJsonLd(text);
    if (ld) return { kind: 'drafts', drafts: await markDuplicates(orgId, [ld]) };
    const body = htmlToText(text);
    if (body.length > 40) {
      const d = await draftFromMaterial({ text: `Event web page ${url}:\n${body.slice(0, 12_000)}` });
      return { kind: 'drafts', drafts: [{ ...d, source: 'link', source_label: 'Event page' }] };
    }
  }
  return { kind: 'error', error: `Couldn’t find an event at that link. ${FEED_HINT}` };
}

/** The smart box: pasted text, a URL, or raw .ics content. */
export async function intakeFromText(orgId: string, text: string): Promise<IntakeResult> {
  const t = text.trim();
  if (!t) return { kind: 'error', error: 'Paste something first.' };
  try {
    if (/BEGIN:VCALENDAR/i.test(t)) {
      const events = parseIcs(t);
      if (!events.length) return { kind: 'error', error: 'That calendar text has no events in it.' };
      return { kind: 'drafts', drafts: await markDuplicates(orgId, upcoming(events, 'ics', 'Calendar invite')) };
    }
    if (/^(https?|webcals?):\/\/\S+$/i.test(t)) return await fromUrl(orgId, t);
    if (/^-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}$/.test(t)) {
      const place = await placeFromText(t);
      if (place) return { kind: 'place', place };
    }
    const d = await draftFromMaterial({ text: t });
    return { kind: 'drafts', drafts: await markDuplicates(orgId, [d]) };
  } catch (e) {
    if (e instanceof FetchBlocked || e instanceof IntakeError) return { kind: 'error', error: e.message };
    throw e;
  }
}

/** Find the text/calendar part of an email (.eml) the invite came in. */
function calendarFromEmail(raw: string): string | null {
  if (/BEGIN:VCALENDAR/i.test(raw) && !/Content-Transfer-Encoding:\s*base64[\s\S]{0,200}text\/calendar/i.test(raw)) {
    const m = /BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/i.exec(raw);
    if (m) return m[0];
  }
  const parts = raw.split(/\r?\n--[^\r\n]+\r?\n/);
  for (const p of parts) {
    if (!/Content-Type:\s*(text\/calendar|application\/ics)/i.test(p)) continue;
    const [head, ...body] = p.split(/\r?\n\r?\n/);
    const content = body.join('\n\n');
    if (/Content-Transfer-Encoding:\s*base64/i.test(head)) return Buffer.from(content.replace(/\s+/g, ''), 'base64').toString('utf8');
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(head)) return content.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return content;
  }
  return null;
}

/** A dropped or chosen file: an .ics invite, an email with one attached, or a photo. */
export async function intakeFromFile(orgId: string, file: File): Promise<IntakeResult> {
  if (file.size > 8_000_000) return { kind: 'error', error: 'That file is over 8 MB. For a photo, take a screenshot of it instead.' };
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  try {
    if (type.startsWith('image/')) {
      const mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type) ? type : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
      if (type === 'image/heic' || name.endsWith('.heic')) return { kind: 'error', error: 'iPhone HEIC photos can’t be read here. Take a screenshot of the photo and drop that in.' };
      const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      const d = await draftFromMaterial({ image: { base64, mediaType } });
      return { kind: 'drafts', drafts: [d] };
    }
    const text = await file.text();
    const cal = name.endsWith('.eml') || /^(Received|From|MIME-Version|Return-Path):/im.test(text.slice(0, 2000)) ? calendarFromEmail(text) : text;
    if (cal && /BEGIN:VCALENDAR/i.test(cal)) {
      const events = parseIcs(cal);
      if (!events.length) return { kind: 'error', error: 'That calendar file has no events in it.' };
      return { kind: 'drafts', drafts: await markDuplicates(orgId, upcoming(events, 'ics', 'Calendar invite')) };
    }
    if (text.trim()) return intakeFromText(orgId, text.slice(0, 20_000));
    return { kind: 'error', error: 'Couldn’t read that file. Drop in a calendar invite (.ics), an email with one attached, or a photo.' };
  } catch (e) {
    if (e instanceof FetchBlocked || e instanceof IntakeError) return { kind: 'error', error: e.message };
    throw e;
  }
}

// ---------- past events, for "repeat" ----------

export type PastEvent = {
  id: string;
  title: string;
  starts_at: Date;
  ends_at: Date;
  activity: Activity;
  location: string | null;
  place_name: string | null;
  place_address: string | null;
  place_lat: number | null;
  place_lng: number | null;
  place_url: string | null;
  volunteer_notes: string | null;
  goal_text: string | null;
  tags: string[];
};

export async function pastEvents(orgId: string): Promise<PastEvent[]> {
  return (await sql`
    select distinct on (lower(e.title)) e.id, e.title, e.starts_at, e.ends_at, e.activity, e.location,
      e.place_name, e.place_address, e.place_lat, e.place_lng, e.place_url, e.volunteer_notes, e.goal_text,
      coalesce(array(select t.name from event_tag et join tag t on t.id = et.tag_id where et.event_id = e.id order by t.name), '{}') as tags
    from event e
    where e.org_id = ${orgId} and not e.is_practice
    order by lower(e.title), e.starts_at desc
  `) as unknown as PastEvent[];
}

/** A past event as a draft for next week, same weekday, same hours. */
export function repeatDraft(p: PastEvent, today: string): IntakeDraft {
  const s = utcToPacific(p.starts_at);
  const e = utcToPacific(p.ends_at);
  const dow = new Date(`${s.ymd}T12:00:00Z`).getUTCDay();
  const t = new Date(`${today}T12:00:00Z`);
  const ahead = ((dow - t.getUTCDay() + 7) % 7) || 7;
  const next = new Date(t.getTime() + ahead * 86_400_000).toISOString().slice(0, 10);
  const place = p.place_lat != null && p.place_lng != null ? { name: p.place_name ?? p.location ?? 'Event location', address: p.place_address ?? '', lat: p.place_lat, lng: p.place_lng, url: p.place_url } : null;
  return {
    title: p.title,
    date: next,
    start: s.hhmm,
    end: e.hhmm,
    location: p.location,
    place,
    notes: p.volunteer_notes,
    goal: p.goal_text,
    activity: p.activity,
    tags: p.tags,
    source: 'repeat',
    source_uid: null,
    source_label: 'A past event',
    check: ['date'],
    warnings: [],
  };
}

// ---------- tags ----------

export async function listTags(orgId: string): Promise<(Tag & { uses: number })[]> {
  return (await sql`
    select t.id, t.name, t.color, count(et.event_id)::int as uses
    from tag t left join event_tag et on et.tag_id = t.id
    where t.org_id = ${orgId}
    group by t.id order by count(et.event_id) desc, t.name
  `) as unknown as (Tag & { uses: number })[];
}

/** Tag ids for these names, creating the missing ones with the next colour in turn. */
export async function ensureTags(orgId: string, names: string[]): Promise<string[]> {
  const clean = [...new Map(names.map((n) => n.replace(/\s+/g, ' ').trim().slice(0, 32)).filter(Boolean).map((n) => [n.toLowerCase(), n])).values()].slice(0, 8);
  if (!clean.length) return [];
  const existing = (await sql`select id, name from tag where org_id = ${orgId} and lower(name) = any(${clean.map((n) => n.toLowerCase())})`) as unknown as { id: string; name: string }[];
  const have = new Map(existing.map((t) => [t.name.toLowerCase(), t.id]));
  const [{ n }] = (await sql`select count(*)::int as n from tag where org_id = ${orgId}`) as unknown as { n: number }[];
  let i = n;
  const ids: string[] = [];
  for (const name of clean) {
    let id = have.get(name.toLowerCase());
    if (!id) {
      const [row] = (await sql`
        insert into tag (org_id, name, color) values (${orgId}, ${name}, ${TAG_COLORS[i++ % TAG_COLORS.length]})
        on conflict (org_id, lower(name)) do update set name = tag.name
        returning id`) as unknown as { id: string }[];
      id = row.id;
    }
    ids.push(id);
  }
  return ids;
}

export async function setEventTags(orgId: string, eventId: string, names: string[]) {
  const ids = await ensureTags(orgId, names);
  await sql.begin(async (tx) => {
    await tx`delete from event_tag where event_id = ${eventId} and event_id in (select id from event where org_id = ${orgId})`;
    for (const id of ids) await tx`insert into event_tag (event_id, tag_id) values (${eventId}, ${id}) on conflict do nothing`;
  });
}

export async function tagsForEvents(eventIds: string[]): Promise<Map<string, Tag[]>> {
  const out = new Map<string, Tag[]>();
  if (!eventIds.length) return out;
  const rows = (await sql`
    select et.event_id, t.id, t.name, t.color from event_tag et join tag t on t.id = et.tag_id
    where et.event_id = any(${eventIds}) order by t.name`) as unknown as (Tag & { event_id: string })[];
  for (const r of rows) out.set(r.event_id, [...(out.get(r.event_id) ?? []), { id: r.id, name: r.name, color: r.color }]);
  return out;
}

// ---------- saving the intake fields ----------

export type IntakeFields = {
  place: Place | null;
  location_text: string | null;
  notes: string | null;
  source: IntakeSource | 'manual';
  source_uid: string | null;
  use_for_site: boolean; // also turn on the leave-the-area check at this pin
};

export async function saveIntakeFields(orgId: string, eventId: string, f: IntakeFields) {
  const p = f.place;
  await sql`
    update event set
      location = ${p ? p.name : f.location_text?.trim() || null},
      place_name = ${p?.name ?? null},
      place_address = ${p?.address ?? null},
      place_lat = ${p?.lat ?? null},
      place_lng = ${p?.lng ?? null},
      place_url = ${p?.url ?? null},
      volunteer_notes = ${f.notes?.trim().slice(0, 1000) || null},
      source = ${f.source},
      source_uid = ${f.source_uid},
      site_lat = case when ${f.use_for_site && !!p} then ${p?.lat ?? null}::double precision else site_lat end,
      site_lng = case when ${f.use_for_site && !!p} then ${p?.lng ?? null}::double precision else site_lng end
    where id = ${eventId} and org_id = ${orgId} and attested_at is null`;
}

export function parsePlace(json: string | null): Place | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as Place;
    if (typeof p.name !== 'string' || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return null;
    const url = typeof p.url === 'string' && /^https:\/\//.test(p.url) ? p.url.slice(0, 500) : null;
    return { name: p.name.slice(0, 120), address: String(p.address ?? '').slice(0, 240), lat: p.lat, lng: p.lng, url };
  } catch {
    return null;
  }
}

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
