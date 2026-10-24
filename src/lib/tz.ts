// Pacific wall-clock time <-> UTC, correct across daylight saving.
// Everything the coordinator types or imports is in the event's local time.

export const TZ = 'America/Los_Angeles';

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Offset of a time zone from UTC at instant `d`, in minutes (Pacific: -420 or -480). */
export function offsetMinutes(d: Date, timeZone = TZ): number {
  const fmt = timeZone === TZ ? partsFmt : new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - d.getTime()) / 60_000);
}

/** "2026-11-14" + "09:30" in `timeZone` (Pacific by default) -> the UTC instant. */
export function zonedToUtc(ymd: string, hhmm: string, timeZone = TZ): Date {
  const [y, mo, da] = ymd.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  // Two passes settle the offset even on the night the clocks change.
  let t = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  t = guess - offsetMinutes(new Date(t), timeZone) * 60_000;
  return new Date(t);
}

export const pacificToUtc = (ymd: string, hhmm: string) => zonedToUtc(ymd, hhmm, TZ);

/** UTC instant -> { ymd: "2026-11-14", hhmm: "09:30" } in Pacific time. */
export function utcToPacific(d: Date): { ymd: string; hhmm: string } {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, hhmm: `${p.hour}:${p.minute}` };
}

export function validTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
