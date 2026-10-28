import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { recordPresence, setLocationOptIn, validLatLng } from '@/lib/presence';

// Volunteer side (owner: volunteer). Reference implementation written with the
// org side so the leave-the-area check works end to end; see
// build/00-SHARED-CONTRACT.md. The volunteer's check-in page calls it.
//   { attendance_id, opt_in: true|false }            turn the check on or off
//   { attendance_id, lat, lng, accuracy_m }          a ping while the page is open
// Returns PresenceResult. Coordinates are used once and never stored.
export async function POST(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const attendanceId = String(body?.attendance_id ?? '');
  if (!/^[0-9a-f-]{36}$/.test(attendanceId)) return NextResponse.json({ error: 'Missing attendance_id.' }, { status: 400 });

  if (typeof body?.opt_in === 'boolean') {
    const ok = await setLocationOptIn(vid, attendanceId, body.opt_in);
    if (!ok) return NextResponse.json({ error: 'You’re not checked in to an open event.' }, { status: 409 });
    return NextResponse.json({ opt_in: body.opt_in });
  }

  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const accuracy = Number(body?.accuracy_m);
  if (!validLatLng(lat, lng) || !Number.isFinite(accuracy)) return NextResponse.json({ error: 'Send lat, lng and accuracy_m.' }, { status: 400 });
  return NextResponse.json(await recordPresence(vid, attendanceId, { lat, lng, accuracy_m: accuracy }));
}
