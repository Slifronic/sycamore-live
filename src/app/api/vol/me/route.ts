import { NextResponse } from 'next/server';
import { currentVolunteer, activeSession, setGoal } from '@/lib/vol-data';
import { noStore, volError } from '../_respond';

// Contract: GET → { volunteer, is_minor, active }. 401 without the `vid` cookie.
// Volunteer addition: PATCH { hours_goal } sets the private personal goal
// (a target, never a claim of hours served; null clears it).
export async function GET() {
  const v = await currentVolunteer();
  if (!v) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  return NextResponse.json(
    { volunteer: { id: v.id, name: v.name, email: v.email, hours_goal: v.hours_goal }, is_minor: v.is_minor, active: await activeSession(v.id) },
    { headers: noStore },
  );
}

export async function PATCH(req: Request) {
  const v = await currentVolunteer();
  if (!v) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !('hours_goal' in body)) return NextResponse.json({ error: 'Send hours_goal.' }, { status: 400 });
  try {
    return NextResponse.json({ hours_goal: await setGoal(v.id, body.hours_goal) });
  } catch (e) {
    return volError(e);
  }
}
