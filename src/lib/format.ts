const TZ = 'America/Los_Angeles';

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });

export const fmtDay = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });

export const fmtTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

export function ago(d: Date | string, now = new Date()) {
  const days = Math.floor((now.getTime() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  return `${Math.round(days / 7)} weeks ago`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

// Server components render once per request, so "now" is the request time.
export function requestNow(): number {
  return Date.now();
}
