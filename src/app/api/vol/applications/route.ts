import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { markApplied, myApplications, setApplicationStatus } from '@/lib/impact';
import { noStore, volError } from '../_respond';

// "I applied" on a public listing, kept for the volunteer and counted on the
// team's /impact page as self-reported.
//   GET                          → { applications }
//   POST  { slug }               → { application }   (marks it applied)
//   PATCH { id, status }         → { application }   (accepted, completed, withdrawn, applied)
export async function GET() {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return NextResponse.json({ applications: await myApplications(vid) }, { headers: noStore });
}

export async function POST(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    return NextResponse.json({ application: await markApplied(vid, body?.slug) }, { headers: noStore });
  } catch (e) {
    return volError(e);
  }
}

export async function PATCH(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    return NextResponse.json({ application: await setApplicationStatus(vid, body?.id, body?.status) }, { headers: noStore });
  } catch (e) {
    return volError(e);
  }
}
