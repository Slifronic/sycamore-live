import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { draftFromSheet, SheetImportError } from '@/lib/sheet-import';

// Contract: multipart `image` → { drafts: SheetDraft[] }. Nothing is saved here.
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/import-sheet'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  if (event.attested_at) return NextResponse.json({ error: 'This event is already verified.' }, { status: 409 });

  const form = await req.formData();
  const file = form.get('image');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a photo of the sheet.' }, { status: 400 });
  const type = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return NextResponse.json({ error: 'Use a JPEG or PNG photo.' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'That photo is over 5 MB.' }, { status: 413 });

  try {
    const drafts = await draftFromSheet({ base64: Buffer.from(await file.arrayBuffer()).toString('base64'), mediaType: type }, event);
    return NextResponse.json({ drafts });
  } catch (e) {
    if (e instanceof SheetImportError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
