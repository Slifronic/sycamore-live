import { NextResponse } from 'next/server';
import { setVolunteerCookie } from '@/lib/vol-session';
import { join } from '@/lib/vol-data';
import { ageOn } from '@/lib/walkin';
import { volError } from '../_respond';
import { acceptTerms } from '../_account';
import { clearPending, readPending } from '@/lib/accounts';
import { limitByIp, RateLimitError } from '@/lib/rate-limit';

// Contract: POST { name, email, date_of_birth } → { volunteer, is_minor } and starts a volunteer session.
// 403 under 13 (nothing stored). 409 { signin: true } for an email that already has an
// account: those sign in at /signin (Google or an emailed code), never with a birth date.
// Volunteer addition: `accept_terms: true` is required ("I agree to the Terms and
// Privacy Policy"), and 13 to 17 also need `guardian_ok: true` ("and a parent or
// guardian knows I'm using SycaMore"). The times are kept as terms_accepted_at
// and guardian_ack_at.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Send your name, email and date of birth.' }, { status: 400 });

  // A missing, odd or under-13 birth date is left to join(), so its refusal
  // reads the same whether or not the boxes were ticked.
  const raw = typeof body.date_of_birth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth) ? body.date_of_birth : null;
  const age = raw ? ageOn(new Date(`${raw}T00:00:00Z`)) : NaN;
  if (!(age < 13)) {
    if (body.accept_terms !== true) return NextResponse.json({ error: 'Tick the box to agree to the Terms and Privacy Policy.' }, { status: 400 });
    if (age < 18 && body.guardian_ok !== true) {
      return NextResponse.json({ error: 'Tick the box to confirm a parent or guardian knows you’re using SycaMore.' }, { status: 400 });
    }
  }

  try {
    await limitByIp('join', 10, 3600);
    // Finishing a Google sign-up: the name and email come from Google, not the form.
    const pending = await readPending('vol');
    const { volunteer, is_new } = await join(
      pending
        ? { ...body, name: body.name || pending.name, email: pending.email, google: { sub: pending.google_sub, email: pending.email } }
        : { ...body, google: null },
    );
    if (pending) await clearPending();
    await acceptTerms(volunteer.id, { guardian: volunteer.is_minor && body.guardian_ok === true });
    await setVolunteerCookie(volunteer.id);
    return NextResponse.json(
      { volunteer: { id: volunteer.id, name: volunteer.name, email: volunteer.email }, is_minor: volunteer.is_minor, is_new },
      { status: is_new ? 201 : 200 },
    );
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    return volError(e);
  }
}
