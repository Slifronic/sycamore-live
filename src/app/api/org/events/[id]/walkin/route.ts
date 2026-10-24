import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { isUuid } from '@/lib/ids';
import { updateWalkin } from '@/lib/walkin';
import { walkinPanel } from '@/lib/walkin-panel';

// Org addition: the event's walk-in sign-up link.
// PATCH { open: true|false } turns it on or off; PATCH { rotate: true } replaces
// the link, so every copy of the old QR code stops working.
export async function PATCH(req: Request, { params }: RouteContext<'/api/org/events/[id]/walkin'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const open = typeof body?.open === 'boolean' ? body.open : undefined;
  const rotate = body?.rotate === true;
  if (open === undefined && !rotate) return NextResponse.json({ error: 'Send { open } or { rotate: true }.' }, { status: 400 });
  const event = await updateWalkin(org.id, id, { open, rotate });
  if (!event) return NextResponse.json({ error: 'Event not found, or already verified.' }, { status: 404 });
  return NextResponse.json({ walkin: await walkinPanel(event) });
}
