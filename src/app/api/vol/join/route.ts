import { NextResponse } from 'next/server';
import { setVolunteerCookie } from '@/lib/vol-session';
import { join } from '@/lib/vol-data';
import { volError } from '../_respond';

// Contract: POST { name, email, date_of_birth } → { volunteer, is_minor } and sets `vid`.
// 403 under 13 (nothing stored). An existing email signs back in with its birth date.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Send your name, email and date of birth.' }, { status: 400 });
  try {
    const { volunteer, is_new } = await join(body);
    await setVolunteerCookie(volunteer.id);
    return NextResponse.json(
      { volunteer: { id: volunteer.id, name: volunteer.name, email: volunteer.email }, is_minor: volunteer.is_minor, is_new },
      { status: is_new ? 201 : 200 },
    );
  } catch (e) {
    return volError(e);
  }
}
