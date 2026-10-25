import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { acceptTerms } from '../_account';

// POST { terms: true } → records that the signed-in volunteer agreed to the
// Terms and Privacy Policy (terms_accepted_at, first time kept). The walk-in
// page calls it right after sign-up; /api/vol/join records it itself.
export async function POST(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.terms !== true) return NextResponse.json({ error: 'Tick the box to agree to the Terms and Privacy Policy.' }, { status: 400 });
  await acceptTerms(vid);
  return NextResponse.json({ ok: true });
}
