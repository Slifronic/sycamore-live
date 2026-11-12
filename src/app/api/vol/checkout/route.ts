import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentVolunteerId } from '@/lib/vol-session';

// Volunteer side (owner: volunteer). Reference implementation written with the
// org side so walk-ins can check themselves out; matches the contract:
//   POST { attendance_id, client_time? } → { attendance } with hours_captured filled in
// client_time (when the tap happened, for a retry after a dropped connection) is
// used only if it is after the check-in and within the last 30 minutes.
export async function POST(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const attendanceId = String(body?.attendance_id ?? '');
  if (!/^[0-9a-f-]{36}$/.test(attendanceId)) return NextResponse.json({ error: 'Missing attendance_id.' }, { status: 400 });

  // An unreadable client_time is ignored (the tap counts as now), never a server error.
  const parsed = body?.client_time ? new Date(String(body.client_time)) : null;
  const tapped = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  // One statement: the check-out time, the status and the hours are written together. As two
  // writes, a failure between them left a row checked out with 0 hours, and an event verified
  // in that gap froze the 0.
  //
  // client_time exists for a tap whose request was retried after a dropped connection, so it
  // is honored only when it is recent (the last 30 minutes) and after the check-in. Anything
  // older is the browser choosing its own hours, and the tap counts as now.
  const [attendance] = (await sql`
    with t as (
      select a.id, case
        when ${tapped}::timestamptz is not null
         and ${tapped}::timestamptz between greatest(a.checked_in_at, now() - interval '30 minutes') and now()
        then ${tapped}::timestamptz else now() end as out_at
      from attendance a join event e on e.id = a.event_id
      where a.id = ${attendanceId} and a.volunteer_id = ${vid}
        and a.status = 'checked_in' and a.checked_in_at is not null and e.attested_at is null
    )
    update attendance a set
      checked_out_at = t.out_at,
      status = 'checked_out',
      hours_captured = round(extract(epoch from (t.out_at - a.checked_in_at)) / 900) * 0.25
    from t where a.id = t.id and a.status = 'checked_in'
    returning a.id, a.event_id, a.status, a.checked_in_at, a.checked_out_at, a.hours_captured`) as unknown as { id: string }[];
  if (!attendance) return NextResponse.json({ error: 'You’re not checked in to an open event.' }, { status: 409 });
  return NextResponse.json({ attendance });
}
