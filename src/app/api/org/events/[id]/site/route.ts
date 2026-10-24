import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { RADIUS_CHOICES, setEventSite, validLatLng } from '@/lib/presence';

// Org addition: the event's site for the leave-the-area check.
// PUT { lat, lng, radius_m } sets it; DELETE turns the check off.
export async function PUT(req: Request, { params }: RouteContext<'/api/org/events/[id]/site'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const radius = Number(body?.radius_m ?? 200);
  if (!validLatLng(lat, lng)) return NextResponse.json({ error: 'That location doesn’t look right. Use your current location or paste “lat, lng”.' }, { status: 400 });
  if (!(RADIUS_CHOICES as readonly number[]).includes(radius)) return NextResponse.json({ error: 'Pick a radius from the list.' }, { status: 400 });
  const site = await setEventSite(org.id, id, { lat, lng, radius_m: radius });
  if (!site) return NextResponse.json({ error: 'Event not found, or already verified.' }, { status: 404 });
  return NextResponse.json({ site });
}

export async function DELETE(_req: Request, { params }: RouteContext<'/api/org/events/[id]/site'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const site = await setEventSite(org.id, id, null);
  if (!site) return NextResponse.json({ error: 'Event not found, or already verified.' }, { status: 404 });
  return NextResponse.json({ site });
}
