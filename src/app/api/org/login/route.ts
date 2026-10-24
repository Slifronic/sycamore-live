import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { setOrgCookie } from '@/lib/session';

// Contract: { pin } → { org } and sets the `oid` cookie.
export async function POST(req: Request) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  const [org] = await sql`select id, name, coordinator_name from org where coordinator_pin = ${String(pin ?? '')}`;
  if (!org) return NextResponse.json({ error: 'That PIN doesn’t match an organization.' }, { status: 401 });
  await setOrgCookie(org.id);
  return NextResponse.json({ org });
}
