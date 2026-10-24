import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { removeMedia } from '@/lib/media';
import type { StoryClip } from '@/lib/story';

const Patch = z.object({ caption: z.string().max(140).optional(), consent: z.boolean().optional() });

// The coordinator edits the caption and confirms consent; only consented clips can be published.
export async function PATCH(req: Request, { params }: RouteContext<'/api/org/events/[id]/story/clips/[clipId]'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id, clipId } = await params;
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Send a caption or a consent value.' }, { status: 400 });
  const { caption, consent } = body.data;
  const [clip] = (await sql`
    update story_clip set
      caption = coalesce(${caption === undefined ? null : caption.trim()}, caption),
      consent = coalesce(${consent ?? null}, consent)
    where id = ${clipId} and event_id = ${id} and org_id = ${org.id}
    returning *
  `) as unknown as StoryClip[];
  if (!clip) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });
  return NextResponse.json({ clip });
}

export async function DELETE(_req: Request, { params }: RouteContext<'/api/org/events/[id]/story/clips/[clipId]'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id, clipId } = await params;
  const [gone] = await sql`delete from story_clip where id = ${clipId} and event_id = ${id} and org_id = ${org.id} returning video_path, poster_path`;
  if (!gone) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });
  await removeMedia(gone.video_path);
  await removeMedia(gone.poster_path);
  return NextResponse.json({ ok: true });
}
