import { NextResponse } from 'next/server';
import { GoogleError, verifyGoogleCredential } from '@/lib/google';
import { currentVolunteerId, setVolunteerCookie } from '@/lib/vol-session';
import { walkInCheckIn, WalkinError, type WalkinWho } from '@/lib/walkin';

// Org addition: walk-in sign-up. One call signs up (or recognizes) the person
// and checks them in to the event the link belongs to, then sets the contract's
// `vid` cookie so the volunteer side knows them from here on.
//   { mode: 'returning' }                                  → uses the vid cookie
//   { mode: 'email', name, email, date_of_birth }
//   { mode: 'google', credential, date_of_birth? }         → 422 { need: 'date_of_birth' } for a new person
export async function POST(req: Request, { params }: RouteContext<'/api/walkin/[token]'>) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const mode = String(body?.mode ?? '');
  try {
    let who: WalkinWho;
    if (mode === 'returning') {
      const vid = await currentVolunteerId();
      if (!vid) return NextResponse.json({ error: 'Sign up below first.' }, { status: 401 });
      who = { kind: 'returning', volunteer_id: vid };
    } else if (mode === 'email') {
      who = { kind: 'email', name: String(body?.name ?? ''), email: String(body?.email ?? ''), date_of_birth: body?.date_of_birth ?? null };
    } else if (mode === 'google') {
      const identity = await verifyGoogleCredential(String(body?.credential ?? ''));
      who = { kind: 'google', identity, date_of_birth: body?.date_of_birth ?? null };
    } else {
      return NextResponse.json({ error: 'Pick Google or email to sign up.' }, { status: 400 });
    }

    const r = await walkInCheckIn(token, who);
    await setVolunteerCookie(r.volunteer.id);
    return NextResponse.json(
      {
        attendance: r.attendance,
        volunteer: r.volunteer,
        is_minor: r.is_minor,
        is_new: r.is_new,
        already: r.already,
        event: { title: r.event.title },
        org: { name: r.org.name },
      },
      { status: r.already ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof GoogleError) return NextResponse.json({ error: e.message }, { status: 401 });
    if (e instanceof WalkinError) return NextResponse.json({ error: e.message, ...(e.need ? { need: e.need } : {}) }, { status: e.status });
    throw e;
  }
}
