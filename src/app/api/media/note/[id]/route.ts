import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { serveMedia } from '@/lib/media';

// Voice notes are private to the organization that recorded them.
export async function GET(req: Request, { params }: RouteContext<'/api/media/note/[id]'>) {
  const org = await currentOrg();
  if (!org) return new Response('Sign in first.', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
  const [note] = await sql`select audio_path, audio_mime from story_note where id = ${id} and org_id = ${org.id}`;
  if (!note?.audio_path) return new Response('Not found', { status: 404 });
  return serveMedia(req, note.audio_path, note.audio_mime);
}
