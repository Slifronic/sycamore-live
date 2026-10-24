import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { createEvent, RuleError } from '@/lib/org-data';
import { ACTIVITY_LABEL, type Activity } from '@/lib/types';

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
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return NextResponse.json({ error: 'Send the event as a JSON object.' }, { status: 400 });
  const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
  if (typeof b.title !== 'string') return bad('title must be text.');
  if (b.title.length > 120) return bad('Keep the title under 120 characters.');
  if (b.location != null && typeof b.location !== 'string') return bad('location must be text.');
  if (typeof b.starts_at !== 'string' || typeof b.ends_at !== 'string') return bad('starts_at and ends_at must be ISO date strings.');
  if (b.activity != null && !(typeof b.activity === 'string' && Object.hasOwn(ACTIVITY_LABEL, b.activity)))
    return bad(`activity must be one of: ${Object.keys(ACTIVITY_LABEL).join(', ')}.`);
  try {
    const event = await createEvent(org.id, {
      title: b.title,
      location: (b.location as string | undefined) ?? null,
      starts_at: new Date(b.starts_at),
      ends_at: new Date(b.ends_at),
      activity: (b.activity as Activity | undefined) ?? 'general',
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
