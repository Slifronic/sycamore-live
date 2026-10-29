import { NextResponse } from 'next/server';
import { GoogleError, verifyGoogleCredential } from '@/lib/google';
import { currentVolunteerId, setVolunteerCookie } from '@/lib/vol-session';
import { ageOn, walkInCheckIn, WalkinError, type WalkinWho } from '@/lib/walkin';
import { acceptTerms, priorConsent } from '../../vol/_account';
import { limitByIp, RateLimitError } from '@/lib/rate-limit';

// Org addition: walk-in sign-up. One call signs up (or recognizes) the person
// and checks them in to the event the link belongs to, then sets the contract's
// `vid` cookie so the volunteer side knows them from here on.
//   { mode: 'returning' }                                  → uses the vid cookie
//   { mode: 'email', name, email, date_of_birth }
//   { mode: 'google', credential, date_of_birth? }         → 422 { need: 'date_of_birth' } for a new person
// Consent is checked and kept here, before anyone is signed up or checked in:
// a new person (or an account that never agreed) must send accept_terms: true,
// and 13 to 17 also guardian_ok: true ("and a parent or guardian knows I'm
// using SycaMore"). The times go in terms_accepted_at and guardian_ack_at.
// Under 13 is left to walkInCheckIn, which refuses it and stores nothing.
const TERMS_MSG = 'Tick the box to agree to the Terms and Privacy Policy.';
const GUARDIAN_MSG = 'Tick the box to confirm a parent or guardian knows you’re using SycaMore.';

export async function POST(req: Request, { params }: RouteContext<'/api/walkin/[token]'>) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const mode = String(body?.mode ?? '');
  try {
    await limitByIp('walkin', 20, 600);
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

    let consent: { needed: boolean; guardian: boolean } = { needed: false, guardian: false };
    if (who.kind !== 'returning') {
      const email = who.kind === 'google' ? who.identity.email : who.email;
      const prior = await priorConsent(email, who.kind === 'google' ? who.identity.sub : null);
      const sent = typeof body?.date_of_birth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth) ? body.date_of_birth : null;
      const dob = prior?.date_of_birth ?? sent;
      const age = dob ? ageOn(new Date(`${dob}T00:00:00Z`)) : NaN; // NaN: a new Google person who hasn't sent a birth date yet
      const teen = age >= 13 && age < 18;
      if (!(age < 13)) {
        if (!prior?.terms && body?.accept_terms !== true) return NextResponse.json({ error: TERMS_MSG }, { status: 400 });
        if (teen && !prior?.guardian && body?.guardian_ok !== true) return NextResponse.json({ error: GUARDIAN_MSG }, { status: 400 });
      }
      consent = { needed: true, guardian: teen && body?.guardian_ok === true };
    }

    const r = await walkInCheckIn(token, who);
    if (consent.needed) await acceptTerms(r.volunteer.id, { guardian: consent.guardian && r.is_minor });
    if (r.sign_in) await setVolunteerCookie(r.volunteer.id);
    return NextResponse.json(
      {
        attendance: r.attendance,
        volunteer: r.volunteer,
        is_minor: r.is_minor,
        is_new: r.is_new,
        already: r.already,
        signed_in: r.sign_in,
        event: { title: r.event.title },
        org: { name: r.org.name },
      },
      { status: r.already ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof GoogleError) return NextResponse.json({ error: e.message }, { status: 401 });
    if (e instanceof WalkinError) return NextResponse.json({ error: e.message, ...(e.need ? { need: e.need } : {}) }, { status: e.status });
    throw e;
  }
}
