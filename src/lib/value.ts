// Dollar value of a volunteer hour, used in funder reports. Grant forms ask
// for in-kind volunteer value at the Independent Sector rate.
// VERIFY: confirm against the research report before the demo.
export const VOLUNTEER_HOUR_VALUE = {
  usd: 34.79,
  label: 'Independent Sector national value of a volunteer hour',
  year: 2024,
};

export const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const rate = () => VOLUNTEER_HOUR_VALUE.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
