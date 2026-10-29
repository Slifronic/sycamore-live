import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { sql } from '@/lib/db';
import { MessageError } from '@/lib/messages';
import { MINOR_CHAT_OFF, isMinor } from '@/lib/minors';
import { chatForVolunteer, chatMembers, isMember, markChatRead, postAsVolunteer, shortName } from '@/lib/event-chat';

// Volunteer side (owner: volunteer). Reference implementation; see
// build/00-SHARED-CONTRACT.md. Only people who came to the event can read or post,
// and never volunteers under 18 (403 for every method; see lib/minors.ts).
//   GET                       → { event, org, members, messages }
//   POST { body }             → post to the group (201)
//   POST { read: true }       → mark the chat read
const UUID = /^[0-9a-f-]{36}$/;

async function who(id: string) {
  const vid = await currentVolunteerId();
  if (!vid) return { error: NextResponse.json({ error: 'Join first.' }, { status: 401 }) };
  if (await isMinor(vid)) return { error: NextResponse.json({ error: MINOR_CHAT_OFF, minor: true }, { status: 403 }) };
  if (!UUID.test(id) || !(await isMember(id, vid))) return { error: NextResponse.json({ error: 'Only people who came to this event can see its chat.' }, { status: 403 }) };
  return { vid };
}

export async function GET(_: Request, { params }: RouteContext<'/api/vol/event-chats/[id]'>) {
  const { id } = await params;
  const w = await who(id);
  if ('error' in w) return w.error;
  const [ev] = (await sql`
    select e.id, e.title, e.starts_at, e.ends_at, e.location, o.id as org_id, o.name as org_name, o.coordinator_name
    from event e join org o on o.id = e.org_id where e.id = ${id}`) as unknown as {
    id: string; title: string; starts_at: Date; ends_at: Date; location: string | null; org_id: string; org_name: string; coordinator_name: string;
  }[];
  const members = (await chatMembers(id)).map((m) => (m.volunteer_id === w.vid ? 'You' : shortName(m.name)));
  return NextResponse.json(
    {
      event: { id: ev.id, title: ev.title, starts_at: ev.starts_at, ends_at: ev.ends_at, location: ev.location },
      org: { id: ev.org_id, name: ev.org_name, coordinator_name: ev.coordinator_name },
      members,
      messages: await chatForVolunteer(id, w.vid),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(req: Request, { params }: RouteContext<'/api/vol/event-chats/[id]'>) {
  const { id } = await params;
  const w = await who(id);
  if ('error' in w) return w.error;
  const body = await req.json().catch(() => null);
  if (body?.read === true) {
    await markChatRead(id, w.vid);
    return NextResponse.json({ ok: true });
  }
  try {
    const message = await postAsVolunteer(w.vid, id, String(body?.body ?? ''));
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    if (e instanceof MessageError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
