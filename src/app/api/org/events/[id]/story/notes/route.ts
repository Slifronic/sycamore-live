import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { isAllowedMime, baseMime, saveUpload } from '@/lib/media';
import type { StoryNote } from '@/lib/story';

// Voice debrief: multipart `transcript` (required), optional `audio` and `duration_s`.
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/story/notes'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const form = await req.formData();
  const transcript = String(form.get('transcript') ?? '').trim();
  if (!transcript) return NextResponse.json({ error: 'The note is empty. Say or type what happened.' }, { status: 400 });
  if (transcript.length > 20_000) return NextResponse.json({ error: 'That note is too long. Split it into two.' }, { status: 413 });
  const audio = form.get('audio');
  let audioPath: string | null = null;
  let audioMime: string | null = null;
  if (audio instanceof File && audio.size > 0) {
    if (!isAllowedMime(audio.type) || !baseMime(audio.type).startsWith('audio/')) return NextResponse.json({ error: 'That recording format isn’t supported.' }, { status: 400 });
    if (audio.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'That recording is over 50 MB.' }, { status: 413 });
    audioPath = await saveUpload(audio);
    audioMime = baseMime(audio.type);
  }
  const duration = Number(form.get('duration_s'));
  const [note] = (await sql`
    insert into story_note (org_id, event_id, transcript, source, audio_path, audio_mime, duration_s)
    values (${org.id}, ${id}, ${transcript}, ${audioPath ? 'voice' : 'typed'}, ${audioPath}, ${audioMime},
            ${Number.isFinite(duration) && duration > 0 ? Math.round(duration * 10) / 10 : null})
    returning *
  `) as unknown as StoryNote[];
  return NextResponse.json({ note });
}
