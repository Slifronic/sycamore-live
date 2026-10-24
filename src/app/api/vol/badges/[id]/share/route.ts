import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { shareBadge } from '@/lib/vol-badges';
import { volError } from '../../../_respond';

// POST → { code, url } for one of the volunteer's signed badges (the
// badge_award id). 403 for a minor and for someone else's badge, like record
// sharing. Sharing twice returns the same link.
export async function POST(_: Request, { params }: RouteContext<'/api/vol/badges/[id]/share'>) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const { id } = await params;
  try {
    return NextResponse.json(await shareBadge(vid, id));
  } catch (e) {
    return volError(e);
  }
}
