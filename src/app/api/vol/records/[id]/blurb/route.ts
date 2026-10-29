import { NextResponse } from 'next/server';
import { limitAi, rateLimited } from '@/lib/rate-limit';
import { currentVolunteerId } from '@/lib/vol-session';
import { volunteerRecord } from '@/lib/vol-data';
import { writeBlurb } from '@/lib/blurb-ai';

// Contract: POST { kind: 'resume' | 'scholarship' } → { text, numbers_ok }.
// Only the volunteer's own attested record; the request body carries nothing
// but the kind, so no typed text reaches the model. Minors may use it: the
// text stays with them, nothing is shared.
export async function POST(req: Request, { params }: RouteContext<'/api/vol/records/[id]/blurb'>) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  try {
    await limitAi(`vol:${vid}`, 20);
  } catch (e) {
    const r = rateLimited(e);
    if (r) return r;
    throw e;
  }
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  if (kind !== 'resume' && kind !== 'scholarship') return NextResponse.json({ error: 'Pick resume or scholarship.' }, { status: 400 });
  const { id } = await params;
  const r = await volunteerRecord(vid, id);
  if (!r) return NextResponse.json({ error: 'No record with that id.' }, { status: 404 });
  if (r.status !== 'active') return NextResponse.json({ error: 'This record was revoked by the organization.' }, { status: 409 });
  return NextResponse.json(await writeBlurb(kind, r), { headers: { 'cache-control': 'no-store' } });
}
