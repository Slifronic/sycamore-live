import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { MessageError, volunteerMarkRead, volunteerReply, volunteerThreads } from '@/lib/messages';

// Volunteer side (owner: volunteer). Reference implementation written with the
// org side so coordinator messages work end to end; see
// build/00-SHARED-CONTRACT.md. The volunteer's Messages screen calls it.
//   GET                                   → { threads: VolThread[], unread }
//   POST { org_id, body }                 → reply to an organization
//   POST { org_id, read: true }           → mark that organization's messages read
const UUID = /^[0-9a-f-]{36}$/;

async function volunteerId() {
  const vid = (await cookies()).get('vid')?.value;
  return vid && UUID.test(vid) ? vid : null;
}

export async function GET() {
  const vid = await volunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const threads = await volunteerThreads(vid);
  return NextResponse.json({ threads, unread: threads.reduce((n, t) => n + t.unread, 0) });
}

export async function POST(req: Request) {
  const vid = await volunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const orgId = String(body?.org_id ?? '');
  if (!UUID.test(orgId)) return NextResponse.json({ error: 'Missing org_id.' }, { status: 400 });

  if (body?.read === true) {
    await volunteerMarkRead(vid, orgId);
    return NextResponse.json({ ok: true });
  }
  try {
    const message = await volunteerReply(vid, orgId, String(body?.body ?? ''));
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    if (e instanceof MessageError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
