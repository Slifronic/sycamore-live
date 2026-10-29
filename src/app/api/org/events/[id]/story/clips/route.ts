import { NextResponse } from 'next/server';
import { limitAi, rateLimited } from '@/lib/rate-limit';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { baseMime, isAllowedMime, removeMedia, saveUpload } from '@/lib/media';
import { describeClip, type StoryClip } from '@/lib/story';

const MAX_VIDEO = 300 * 1024 * 1024;

// Video intake: multipart `video`, plus still `frames` (JPEG) the browser cut
// from it with their `frame_times`, an optional `poster` and `duration_s`.
// Claude reads only the frames; the video itself is stored, not sent anywhere.
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/story/clips'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  try {
    await limitAi(`org:${org.id}`);
  } catch (e) {
    const r = rateLimited(e);
    if (r) return r;
    throw e;
  }
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const form = await req.formData();
  const video = form.get('video');
  if (!(video instanceof File) || video.size === 0) return NextResponse.json({ error: 'Attach a video.' }, { status: 400 });
  if (!isAllowedMime(video.type) || !baseMime(video.type).startsWith('video/'))
    return NextResponse.json({ error: 'Use an MP4, MOV or WebM video.' }, { status: 400 });
  if (video.size > MAX_VIDEO) return NextResponse.json({ error: 'That video is over 300 MB. Trim it on your phone first.' }, { status: 413 });

  const frames = form.getAll('frames').filter((f): f is File => f instanceof File && f.size > 0 && f.size < 3 * 1024 * 1024).slice(0, 8);
  let times: number[] = [];
  try {
    times = JSON.parse(String(form.get('frame_times') ?? '[]')).map(Number);
  } catch {}
  const poster = form.get('poster');
  const duration = Number(form.get('duration_s'));

  const videoPath = await saveUpload(video);
  const posterPath = poster instanceof File && poster.size > 0 && baseMime(poster.type) === 'image/jpeg' ? await saveUpload(poster) : null;
  try {
    const description = await describeClip(
      await Promise.all(frames.map(async (f, i) => ({ base64: Buffer.from(await f.arrayBuffer()).toString('base64'), at_s: times[i] ?? 0 }))),
      event,
    );
    const [clip] = (await sql`
      insert into story_clip (org_id, event_id, video_path, video_mime, poster_path, original_name, size_bytes, duration_s, description, caption)
      values (${org.id}, ${id}, ${videoPath}, ${baseMime(video.type)}, ${posterPath}, ${video.name.slice(0, 200)}, ${video.size},
              ${Number.isFinite(duration) && duration > 0 ? Math.round(duration * 10) / 10 : null},
              ${description ? sql.json(description as never) : null}, ${description?.caption ?? null})
      returning *
    `) as unknown as StoryClip[];
    return NextResponse.json({ clip, described: !!description });
  } catch (e) {
    await removeMedia(videoPath);
    await removeMedia(posterPath);
    throw e;
  }
}
