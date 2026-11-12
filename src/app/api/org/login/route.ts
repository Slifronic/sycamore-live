import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { limit, limitByIp, RateLimitError } from '@/lib/rate-limit';
import { setOrgCookie } from '@/lib/session';

// Contract: { pin } → { org } and sets the org session cookie.
//
// The same rules as the sign-in form (src/app/org/actions.ts, signIn): a 6-digit PIN is
// guessable, so 8 tries per 15 minutes per address and a site-wide ceiling on misses, and an
// organization that turned its PIN off cannot be signed in to with it. This route used to
// have none of the three.
export async function POST(req: Request) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  const code = String(pin ?? '').replace(/\D/g, '');
  if (code.length !== 6) return NextResponse.json({ error: 'Your PIN is 6 digits.' }, { status: 400 });
  try {
    await limitByIp('pin', 8, 900);
    const [org] = await sql`select id, name, coordinator_name from org where coordinator_pin = ${code} and pin_enabled`;
    if (!org) {
      await limit('pin:misses', 300, 3600);
      return NextResponse.json({ error: 'That PIN doesn’t match an organization that signs in with a PIN.' }, { status: 401 });
    }
    await setOrgCookie(org.id);
    return NextResponse.json({ org });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    throw e;
  }
}
