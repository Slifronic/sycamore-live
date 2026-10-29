import { NextResponse } from 'next/server';
import { AuthError, verifyVolunteerCode } from '@/lib/accounts';
import { RateLimitError } from '@/lib/rate-limit';

// POST { email, code } → 200 and the volunteer session cookie, or 400.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    await verifyVolunteerCode(String(body?.email ?? ''), String(body?.code ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
