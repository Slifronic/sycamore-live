import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { removeMedia } from '@/lib/media';

export async function DELETE(_req: Request, { params }: RouteContext<'/api/org/events/[id]/story/notes/[noteId]'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id, noteId } = await params;
  const [gone] = await sql`delete from story_note where id = ${noteId} and event_id = ${id} and org_id = ${org.id} returning audio_path`;
  if (!gone) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
  await removeMedia(gone.audio_path);
  return NextResponse.json({ ok: true });
}
