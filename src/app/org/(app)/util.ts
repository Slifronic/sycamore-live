export { ago, fmtDay, fmtDate, fmtTime, plural, initials } from '@/lib/format';

export const fmtHoursSafe = (h: number) => h.toLocaleString('en-US', { maximumFractionDigits: 2 });
