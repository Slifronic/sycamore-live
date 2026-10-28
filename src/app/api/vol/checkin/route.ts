import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { checkIn } from '@/lib/vol-data';
import { volError } from '../_respond';
import { limit, limitByIp, RateLimitError } from '@/lib/rate-limit';

// Contract: POST { code } → { attendance, event, org }.
// 404 bad code, 409 already checked in, 410 event closed. Practice events never match.
// Optional `via: 'qr'` records that the code came from scanning the QR.
// No time or hours are read from the body: the server stamps check-in itself.
export async function POST(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    await limit(`checkin:${vid}`, 12, 3600);
    await limitByIp('checkin', 40, 3600);
    return NextResponse.json(await checkIn(vid, body?.code, body?.via), { status: 201 });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    return volError(e);
  }
}
