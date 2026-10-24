import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentVolunteerId } from '@/lib/vol-session';

// Volunteer side (owner: volunteer). Reference implementation written with the
// org side so walk-ins can check themselves out; matches the contract:
//   POST { attendance_id, client_time? } → { attendance } with hours_captured filled in
// client_time (when the tap happened, for a retry after a dropped connection) is
// used only if it falls between the check-in and now.
export async function POST(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const attendanceId = String(body?.attendance_id ?? '');
  if (!/^[0-9a-f-]{36}$/.test(attendanceId)) return NextResponse.json({ error: 'Missing attendance_id.' }, { status: 400 });

  const tapped = body?.client_time ? new Date(String(body.client_time)) : null;
  const [row] = (await sql`
    update attendance a set
      checked_out_at = case
        when ${tapped}::timestamptz is not null and ${tapped}::timestamptz between a.checked_in_at and now() then ${tapped}::timestamptz
        else now() end,
      status = 'checked_out'
    from event e
    where a.id = ${attendanceId} and a.volunteer_id = ${vid} and a.event_id = e.id
      and a.status = 'checked_in' and a.checked_in_at is not null and e.attested_at is null
    returning a.id`) as unknown as { id: string }[];
  if (!row) return NextResponse.json({ error: 'You’re not checked in to an open event.' }, { status: 409 });

  // Hours from the timestamps only (lib/hours.ts rule: nearest quarter hour).
  const [attendance] = await sql`
    update attendance set hours_captured = round(extract(epoch from (checked_out_at - checked_in_at)) / 900) * 0.25
    where id = ${row.id}
    returning id, event_id, status, checked_in_at, checked_out_at, hours_captured`;
  return NextResponse.json({ attendance });
}
