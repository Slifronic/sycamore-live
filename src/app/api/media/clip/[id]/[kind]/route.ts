import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { serveMedia } from '@/lib/media';

// A clip is visible to its organization, or to anyone once it is consented
// and part of a published campaign's storyboard.
export async function GET(req: Request, { params }: RouteContext<'/api/media/clip/[id]/[kind]'>) {
  const { id, kind } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || (kind !== 'video' && kind !== 'poster')) return new Response('Not found', { status: 404 });
  const [clip] = await sql`
    select c.org_id, c.video_path, c.video_mime, c.poster_path,
      exists (
        select 1 from campaign k
        where k.event_id = c.event_id and k.status = 'published' and c.consent
          and k.draft->'storyboard' @> ${sql.json([{ clip_id: id }] as never)}
      ) as public
    from story_clip c where c.id = ${id}
  `;
  if (!clip) return new Response('Not found', { status: 404 });
  if (!clip.public) {
    const org = await currentOrg();
    if (!org || org.id !== clip.org_id) return new Response('Not found', { status: 404 });
  }
  if (kind === 'poster') return clip.poster_path ? serveMedia(req, clip.poster_path, 'image/jpeg') : new Response('Not found', { status: 404 });
  return serveMedia(req, clip.video_path, clip.video_mime);
}
