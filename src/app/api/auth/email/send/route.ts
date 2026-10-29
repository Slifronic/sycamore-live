import { NextResponse } from 'next/server';
import { AuthError, sendVolunteerCode } from '@/lib/accounts';
import { RateLimitError } from '@/lib/rate-limit';

// POST { email } → 200 { sent: true } whether or not the email has an account,
// so this can't be used to find out who volunteers here.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    await sendVolunteerCode(String(body?.email ?? ''));
    return NextResponse.json({ sent: true });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429, headers: { 'retry-after': String(e.retryAfterSec) } });
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('email code', e);
    return NextResponse.json({ error: 'We couldn’t send the email just now. Try Google, or try again in a minute.' }, { status: 503 });
  }
}
