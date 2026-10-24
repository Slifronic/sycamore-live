import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { isUuid } from '@/lib/ids';

// Contract: the live roster, polled every 3 seconds by the event-day screen.
export async function GET(_: Request, { params }: RouteContext<'/api/org/events/[id]'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const event = await getEvent(org.id, id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  return NextResponse.json({ event, attendance: await getRoster(id) }, { headers: { 'cache-control': 'no-store' } });
}
