// Dollar value of a volunteer hour, used in funder reports. Grant forms ask
// for in-kind volunteer value at the Independent Sector rate.
// Source: Independent Sector & Do Good Institute, released 2026-04-21, for
// calendar 2025 (preliminary): https://independentsector.org/research/value-of-volunteer-time/
export const HOUR_RATES = {
  us: { usd: 36.14, label: 'national' },
  ca: { usd: 41.75, label: 'California' },
} as const;
export type RateKey = keyof typeof HOUR_RATES;

export const RATE_SOURCE = 'Independent Sector value of volunteer time, 2025 (preliminary, released April 2026)';

export const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export const rateKeyFor = (city: string | null | undefined): RateKey => (city?.includes('CA') ? 'ca' : 'us');
