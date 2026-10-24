import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { shareRecord } from '@/lib/vol-data';
import { volError } from '../../../_respond';

// Contract: POST → { code, url }. 403 for a minor and for someone else's record.
// Sharing twice returns the same link.
export async function POST(_: Request, { params }: RouteContext<'/api/vol/records/[id]/share'>) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const { id } = await params;
  try {
    return NextResponse.json(await shareRecord(vid, id));
  } catch (e) {
    return volError(e);
  }
}
