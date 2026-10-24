import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { savedEventIds, setSaved } from '@/lib/vol-discover';
import { noStore, volError } from '../_respond';

// Discover's "Save for later", kept per volunteer on the server.
//   GET                              → { event_ids }
//   POST { event_id, saved: bool }   → { saved }
// Only the event id is stored. Nothing about why (no resume text, no preferences).
export async function GET() {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  return NextResponse.json({ event_ids: await savedEventIds(vid) }, { headers: noStore });
}

export async function POST(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    return NextResponse.json({ saved: await setSaved(vid, body?.event_id, body?.saved) });
  } catch (e) {
    return volError(e);
  }
}
