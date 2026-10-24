import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { createEvent, RuleError } from '@/lib/org-data';
import type { Activity } from '@/lib/types';

export async function GET() {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const events = await sql`select * from event where org_id = ${org.id} order by starts_at desc`;
  return NextResponse.json({ events });
}

// Contract: { title, location, starts_at, ends_at } → { event } with a fresh checkin_code.
export async function POST(req: Request) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  try {
    const event = await createEvent(org.id, {
      title: b.title ?? '',
      location: b.location ?? null,
      starts_at: new Date(b.starts_at),
      ends_at: new Date(b.ends_at),
      activity: (b.activity as Activity) ?? 'general',
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
