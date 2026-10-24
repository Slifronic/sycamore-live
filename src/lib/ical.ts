// iCalendar (RFC 5545), only the parts event intake needs: read VEVENTs from
// an invite or a feed, expand simple repeats, and write feeds and single events.
import { offsetMinutes, utcToPacific, validTimeZone, zonedToUtc, TZ } from './tz';

export type IcsEvent = {
  uid: string | null;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
  description: string | null;
  url: string | null;
  geo: { lat: number; lng: number } | null;
  status: string | null;
};

type Prop = { name: string; params: Record<string, string>; value: string };

/** Undo line folding: a line that starts with a space or tab continues the previous one. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line: string): Prop | null {
  // NAME;PARAM=VALUE;PARAM="QUOTED:VALUE":VALUE. The first colon outside quotes ends the name part.
  let inQuote = false;
  let split = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ':' && !inQuote) {
      split = i;
      break;
    }
  }
  if (split < 0) return null;
  const [name, ...rawParams] = line.slice(0, split).split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(split + 1) };
}

const unescapeText = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();

// Microsoft calendars write Windows zone names; map the Pacific ones we will meet.
const WINDOWS_TZ: Record<string, string> = {
  'Pacific Standard Time': 'America/Los_Angeles',
  'Mountain Standard Time': 'America/Denver',
  'Central Standard Time': 'America/Chicago',
  'Eastern Standard Time': 'America/New_York',
};

/** A DTSTART/DTEND value -> instant. Handles UTC (Z), TZID, floating time (read as Pacific) and all-day dates. */
function parseDate(p: Prop): { date: Date; allDay: boolean } | null {
  const v = p.value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly || p.params.VALUE === 'DATE') {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(v);
    if (!m) return null;
    return { date: zonedToUtc(`${m[1]}-${m[2]}-${m[3]}`, '00:00'), allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(v);
  if (!m) return null;
  const ymd = `${m[1]}-${m[2]}-${m[3]}`;
  const hhmm = `${m[4]}:${m[5]}`;
  if (m[7]) return { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0))), allDay: false };
  let tz = p.params.TZID ? (WINDOWS_TZ[p.params.TZID] ?? p.params.TZID.replace(/^\//, '')) : TZ;
  if (!validTimeZone(tz)) tz = TZ;
  return { date: zonedToUtc(ymd, hhmm, tz), allDay: false };
}

function parseDuration(v: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return null;
  const ms = (+(m[2] ?? 0) * 7 * 86400 + +(m[3] ?? 0) * 86400 + +(m[4] ?? 0) * 3600 + +(m[5] ?? 0) * 60 + +(m[6] ?? 0)) * 1000;
  return m[1] === '-' ? -ms : ms;
}

type RawEvent = IcsEvent & { rrule: string | null; exdates: number[]; recurrenceId: boolean };

function readEvents(text: string): RawEvent[] {
  const out: RawEvent[] = [];
  let cur: Prop[] | null = null;
  let depth = 0; // VALARM and friends nest inside VEVENT
  for (const line of unfold(text)) {
    if (/^BEGIN:VEVENT$/i.test(line)) {
      cur = [];
      depth = 0;
      continue;
    }
    if (!cur) continue;
    if (/^BEGIN:/i.test(line)) {
      depth++;
      continue;
    }
    if (/^END:VEVENT$/i.test(line) && depth === 0) {
      const ev = toEvent(cur);
      if (ev) out.push(ev);
      cur = null;
      continue;
    }
    if (/^END:/i.test(line)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth > 0) continue;
    const p = parseLine(line);
    if (p) cur.push(p);
  }
  return out;
}

function toEvent(props: Prop[]): RawEvent | null {
  const get = (n: string) => props.find((p) => p.name === n);
  const startP = get('DTSTART');
  if (!startP) return null;
  const start = parseDate(startP);
  if (!start) return null;
  const endP = get('DTEND');
  let end = endP ? parseDate(endP)?.date : undefined;
  if (!end) {
    const dur = get('DURATION');
    const ms = dur ? parseDuration(dur.value) : null;
    end = new Date(start.date.getTime() + (ms ?? (start.allDay ? 86_400_000 : 3_600_000)));
  }
  const geoP = get('GEO');
  const geo = geoP ? geoP.value.split(/[;,]/).map(Number) : null;
  const exdates = props
    .filter((p) => p.name === 'EXDATE')
    .flatMap((p) => p.value.split(',').map((v) => parseDate({ ...p, value: v })?.date.getTime() ?? NaN))
    .filter((n) => !Number.isNaN(n));
  const urlP = get('URL');
  return {
    uid: get('UID')?.value.trim() || null,
    title: unescapeText(get('SUMMARY')?.value ?? '') || 'Untitled event',
    start: start.date,
    end,
    allDay: start.allDay,
    location: get('LOCATION') ? unescapeText(get('LOCATION')!.value) || null : null,
    description: get('DESCRIPTION') ? unescapeText(get('DESCRIPTION')!.value) || null : null,
    url: urlP && /^https?:\/\//i.test(urlP.value.trim()) ? urlP.value.trim() : null,
    geo: geo && geo.length === 2 && geo.every(Number.isFinite) ? { lat: geo[0], lng: geo[1] } : null,
    status: get('STATUS')?.value.trim().toUpperCase() || null,
    rrule: get('RRULE')?.value ?? null,
    exdates,
    recurrenceId: !!get('RECURRENCE-ID'),
  };
}

const DAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/**
 * Expand a simple RRULE (DAILY, WEEKLY with BYDAY, MONTHLY on the same date)
 * into instances inside [from, to]. Instances keep the Pacific wall-clock time,
 * so a 9 AM event stays at 9 AM across daylight saving. Anything fancier
 * (BYSETPOS, YEARLY...) returns just the first occurrence.
 */
function expand(ev: RawEvent, from: Date, to: Date, cap = 200): IcsEvent[] {
  const base: IcsEvent = { ...ev };
  if (!ev.rrule) return [base];
  const r = Object.fromEntries(ev.rrule.split(';').map((kv) => kv.split('=') as [string, string]));
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL ?? 1));
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? parseDate({ name: 'UNTIL', params: {}, value: r.UNTIL })?.date ?? null : null;
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(freq) || r.BYSETPOS) return [base];

  const durMs = ev.end.getTime() - ev.start.getTime();
  const local = utcToPacific(ev.start);
  const [y0, m0, d0] = local.ymd.split('-').map(Number);
  const byday = freq === 'WEEKLY' && r.BYDAY ? r.BYDAY.split(',').map((d) => DAY[d.slice(-2)]).filter((n) => n !== undefined) : null;
  const out: IcsEvent[] = [];
  let produced = 0;
  const ex = new Set(ev.exdates);

  const emit = (y: number, m: number, d: number) => {
    const ymd = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
    const start = ev.allDay ? zonedToUtc(ymd, '00:00') : zonedToUtc(ymd, local.hhmm);
    if (start < ev.start) return true;
    if (until && start > until) return false;
    if (produced >= count) return false;
    produced++;
    if (!ex.has(start.getTime()) && start >= new Date(from.getTime() - durMs) && start <= to) {
      out.push({ ...base, start, end: new Date(start.getTime() + durMs) });
    }
    return start <= to && out.length < cap;
  };

  for (let step = 0; step < 2000; step++) {
    if (freq === 'DAILY') {
      if (!emit(y0, m0, d0 + step * interval)) break;
    } else if (freq === 'MONTHLY') {
      const mm = m0 - 1 + step * interval;
      const y = y0 + Math.floor(mm / 12);
      const m = (mm % 12) + 1;
      if (new Date(Date.UTC(y, m - 1, d0)).getUTCMonth() !== m - 1) continue; // no 31st this month
      if (!emit(y, m, d0)) break;
    } else {
      // WEEKLY: walk weeks from the start date's week, then each listed weekday.
      const startDow = new Date(Date.UTC(y0, m0 - 1, d0)).getUTCDay();
      const days = byday?.length ? [...byday].sort((a, b) => a - b) : [startDow];
      let keep = true;
      for (const dow of days) {
        if (!emit(y0, m0, d0 - startDow + step * 7 * interval + dow)) {
          keep = false;
          break;
        }
      }
      if (!keep) break;
    }
  }
  return out;
}

/** Every event in an .ics file. Repeating events become their instances between `from` and `to`. */
export function parseIcs(text: string, opts: { from?: Date; to?: Date } = {}): IcsEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(text) && !/BEGIN:VEVENT/i.test(text)) return [];
  const from = opts.from ?? new Date(0);
  const to = opts.to ?? new Date(Date.now() + 5 * 365 * 86_400_000);
  return readEvents(text)
    .filter((e) => !e.recurrenceId && e.status !== 'CANCELLED')
    .flatMap((e) => expand(e, from, to))
    .filter((e) => e.end >= from && e.start <= to)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ---------- writing ----------

const escapeText = (v: string) => v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Fold to 75 octets per line, as the spec asks; continuation lines start with a space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = '';
      len = 0;
    }
    cur += ch;
    len += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export type FeedEvent = {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  geo?: { lat: number; lng: number } | null;
  categories?: string[];
  updated?: Date;
};

/** A calendar file. Times are written in UTC, which every calendar app reads correctly. */
export function buildIcs(name: string, events: FeedEvent[], opts: { refreshHours?: number } = {}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SycaMore Live//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${TZ}`,
  ];
  if (opts.refreshHours) {
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${opts.refreshHours}H`, `X-PUBLISHED-TTL:PT${opts.refreshHours}H`);
  }
  const now = stamp(new Date());
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${e.updated ? stamp(e.updated) : now}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end)}`,
      `SUMMARY:${escapeText(e.title)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.geo) lines.push(`GEO:${e.geo.lat.toFixed(6)};${e.geo.lng.toFixed(6)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.categories?.length) lines.push(`CATEGORIES:${e.categories.map(escapeText).join(',')}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// ---------- calendar links ----------

const gStamp = (d: Date) => stamp(d);

/** "Add to Google Calendar" for one event. */
export function googleCalendarLink(e: { title: string; start: Date; end: Date; location?: string | null; details?: string | null }) {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${gStamp(e.start)}/${gStamp(e.end)}`, ctz: TZ });
  if (e.location) q.set('location', e.location);
  if (e.details) q.set('details', e.details);
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** "Add to Outlook" (outlook.com and Microsoft 365 web). */
export function outlookCalendarLink(e: { title: string; start: Date; end: Date; location?: string | null; details?: string | null }) {
  const q = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: e.title, startdt: e.start.toISOString(), enddt: e.end.toISOString() });
  if (e.location) q.set('location', e.location);
  if (e.details) q.set('body', e.details);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q}`;
}

/**
 * Read event details back out of an "add to calendar" link someone pasted:
 * Google's template links and Outlook's compose links carry everything in the URL.
 */
export function parseCalendarLink(raw: string): { title: string; start: Date; end: Date; location: string | null; details: string | null } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const q = u.searchParams;
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'calendar.google.com' && (q.get('action') === 'TEMPLATE' || u.pathname.includes('/event'))) {
    const dates = q.get('dates');
    if (!dates) return null;
    const [a, b] = dates.split('/');
    const tz = q.get('ctz') && validTimeZone(q.get('ctz')!) ? q.get('ctz')! : TZ;
    const toDate = (v: string) => (v ? parseDate({ name: 'DTSTART', params: v.endsWith('Z') ? {} : { TZID: tz }, value: v })?.date ?? null : null);
    const start = toDate(a);
    const end = toDate(b) ?? (start ? new Date(start.getTime() + 3_600_000) : null);
    if (!start || !end) return null;
    return { title: q.get('text') ?? 'Untitled event', start, end, location: q.get('location'), details: q.get('details') };
  }
  if (/outlook\.(live|office|office365)\.com$/.test(host) && (q.get('startdt') || q.get('subject'))) {
    const start = q.get('startdt') ? new Date(q.get('startdt')!) : null;
    const end = q.get('enddt') ? new Date(q.get('enddt')!) : start ? new Date(start.getTime() + 3_600_000) : null;
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return null;
    return { title: q.get('subject') ?? 'Untitled event', start, end, location: q.get('location'), details: q.get('body') };
  }
  return null;
}

/** For tests and debugging: the Pacific offset in hours at an instant. */
export const pacificOffsetHours = (d: Date) => offsetMinutes(d) / 60;
