import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';

// One row per verified attendance: what a school counselor or a grant
// spreadsheet needs, with the adjustment reason kept next to the hours.
export async function GET() {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const rows = await sql`
    select a.display_name, v.email, e.title, to_char(e.starts_at at time zone 'America/Los_Angeles', 'YYYY-MM-DD') as date,
      a.role, a.hours_captured, a.hours_adjusted, coalesce(a.hours_adjusted, a.hours_captured) as hours, a.adjustment_reason,
      to_char(a.attested_at at time zone 'America/Los_Angeles', 'YYYY-MM-DD HH24:MI') as verified_at
    from attendance a join event e on e.id = a.event_id left join volunteer v on v.id = a.volunteer_id
    where e.org_id = ${org.id} and not e.is_practice and a.status = 'attested'
    order by e.starts_at, a.display_name`;
  const cols = ['display_name', 'email', 'title', 'date', 'role', 'hours', 'hours_captured', 'hours_adjusted', 'adjustment_reason', 'verified_at'];
  // A leading = + - @ (or tab/CR) would run as a formula in Excel or Sheets: prefix a quote so it stays text.
  const esc = (v: unknown) => {
    if (v == null) return '';
    const raw = String(v);
    const s = typeof v === 'string' && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [['volunteer', 'email', 'event', 'date', 'role', 'hours', 'hours_from_scans', 'hours_adjusted', 'adjustment_reason', 'verified_at'].join(','),
    ...rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(','))].join('\n');
  const name = org.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}-verified-hours.csv"` } });
}
