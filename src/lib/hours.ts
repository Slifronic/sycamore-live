// Hours rule from the shared contract: round to the nearest quarter hour.
// A missing time means 0 hours; the system never invents a check-out.
export function hoursBetween(inAt: Date | string | null, outAt: Date | string | null): number {
  if (!inAt || !outAt) return 0;
  const ms = new Date(outAt).getTime() - new Date(inAt).getTime();
  if (!(ms > 0)) return 0;
  return Math.round(ms / (15 * 60 * 1000)) * 0.25;
}

export function hoursTotal(a: { hours_captured: number | string; hours_adjusted: number | string | null }): number {
  return Number(a.hours_adjusted ?? a.hours_captured);
}

export function fmtHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0$/, '');
}
