import 'server-only';
import { sql } from './db';
import { MAX_BODY, MessageError } from './messages';
import type { Org } from './types';

// One group chat per event: the coordinator plus everyone with an account who
// came to it. Use it for "parking is on Elm St", "we're by the blue tent",
// "thanks all". It stays inside SycaMore like every other message: no phone
// numbers, and volunteers see each other only as "Ana R.".

export type ChatAuthor = { kind: 'org' | 'volunteer'; name: string; volunteer_id: string | null };
export type ChatMessage = { id: string; author: ChatAuthor; body: string; created_at: Date };
export type ChatMember = { volunteer_id: string; name: string; status: string };

export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first!;
};

export async function chatMembers(eventId: string): Promise<ChatMember[]> {
  return (await sql`
    select distinct on (a.volunteer_id) a.volunteer_id, v.name, a.status
    from attendance a join volunteer v on v.id = a.volunteer_id
    where a.event_id = ${eventId} and a.volunteer_id is not null and a.status <> 'no_show'
    order by a.volunteer_id
  `) as unknown as ChatMember[];
}

export async function isMember(eventId: string, volunteerId: string) {
  const [r] = await sql`
    select exists (select 1 from attendance a join event e on e.id = a.event_id
      where a.event_id = ${eventId} and a.volunteer_id = ${volunteerId} and a.status <> 'no_show' and e.is_practice = false) as ok`;
  return !!r?.ok;
}

type Row = { id: string; volunteer_id: string | null; author_name: string; body: string; created_at: Date };

async function rows(eventId: string): Promise<Row[]> {
  return (await sql`select id, volunteer_id, author_name, body, created_at from event_chat where event_id = ${eventId} order by created_at`) as unknown as Row[];
}

// The coordinator sees full names; volunteers see "Ana R." for everyone else.
export async function chatForOrg(eventId: string): Promise<ChatMessage[]> {
  return (await rows(eventId)).map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    author: { kind: r.volunteer_id ? 'volunteer' : 'org', name: r.author_name, volunteer_id: r.volunteer_id },
  }));
}

export async function chatForVolunteer(eventId: string, me: string): Promise<(ChatMessage & { mine: boolean })[]> {
  return (await rows(eventId)).map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    mine: r.volunteer_id === me,
    author: r.volunteer_id
      ? { kind: 'volunteer', name: r.volunteer_id === me ? 'You' : shortName(r.author_name), volunteer_id: null }
      : { kind: 'org', name: `${r.author_name} (coordinator)`, volunteer_id: null },
  }));
}

function clean(body: string) {
  const text = body.replace(/\r\n/g, '\n').trim();
  if (!text) throw new MessageError('Write a message first.');
  if (text.length > MAX_BODY) throw new MessageError(`Keep it under ${MAX_BODY} characters.`);
  return text;
}

export async function postAsOrg(org: Org, eventId: string, body: string) {
  const text = clean(body);
  const [ev] = await sql`select id from event where id = ${eventId} and org_id = ${org.id}`;
  if (!ev) throw new MessageError('That event isn’t yours.', 404);
  await sql`insert into event_chat (org_id, event_id, volunteer_id, author_name, body) values (${org.id}, ${eventId}, null, ${org.coordinator_name}, ${text})`;
  await markChatRead(eventId, 'org');
}

export async function postAsVolunteer(volunteerId: string, eventId: string, body: string) {
  const text = clean(body);
  if (!(await isMember(eventId, volunteerId))) throw new MessageError('Only people who came to this event can post in its chat.', 403);
  const [row] = await sql`
    insert into event_chat (org_id, event_id, volunteer_id, author_name, body)
    select e.org_id, e.id, v.id, v.name, ${text} from event e, volunteer v where e.id = ${eventId} and v.id = ${volunteerId}
    returning id, created_at`;
  await markChatRead(eventId, volunteerId);
  return row as { id: string; created_at: Date };
}

export async function markChatRead(eventId: string, reader: string) {
  await sql`
    insert into event_chat_read (event_id, reader, last_read_at) values (${eventId}, ${reader}, now())
    on conflict (event_id, reader) do update set last_read_at = now()`;
}

export type OrgChatSummary = {
  event_id: string;
  title: string;
  starts_at: Date;
  ends_at: Date;
  location: string | null;
  members: number;
  messages: number;
  last_body: string | null;
  last_author: string | null;
  last_at: Date | null;
  unread: number;
};

// Every real event with people in it, busiest and newest first.
export async function orgChats(orgId: string): Promise<OrgChatSummary[]> {
  return (await sql`
    select e.id as event_id, e.title, e.starts_at, e.ends_at, e.location,
      (select count(distinct a.volunteer_id)::int from attendance a where a.event_id = e.id and a.volunteer_id is not null and a.status <> 'no_show') as members,
      (select count(*)::int from event_chat c where c.event_id = e.id) as messages,
      l.body as last_body, l.author_name as last_author, l.created_at as last_at,
      (select count(*)::int from event_chat c where c.event_id = e.id and c.volunteer_id is not null
         and c.created_at > coalesce((select last_read_at from event_chat_read r where r.event_id = e.id and r.reader = 'org'), 'epoch')) as unread
    from event e
    left join lateral (select body, author_name, created_at from event_chat c where c.event_id = e.id order by created_at desc limit 1) l on true
    where e.org_id = ${orgId} and e.is_practice = false
    order by l.created_at desc nulls last, e.starts_at desc
  `) as unknown as OrgChatSummary[];
}

export async function orgChatUnread(orgId: string): Promise<number> {
  const [r] = await sql`
    select count(*)::int as n from event_chat c
    where c.org_id = ${orgId} and c.volunteer_id is not null
      and c.created_at > coalesce((select last_read_at from event_chat_read r where r.event_id = c.event_id and r.reader = 'org'), 'epoch')`;
  return r?.n ?? 0;
}

export type VolChatSummary = {
  event: { id: string; title: string; starts_at: Date; location: string | null };
  org: { id: string; name: string };
  members: number;
  unread: number;
  last: { author: string; body: string; created_at: Date } | null;
};

export async function volunteerChats(volunteerId: string): Promise<VolChatSummary[]> {
  const list = (await sql`
    select e.id, e.title, e.starts_at, e.location, o.id as org_id, o.name as org_name,
      (select count(distinct a2.volunteer_id)::int from attendance a2 where a2.event_id = e.id and a2.volunteer_id is not null and a2.status <> 'no_show') as members,
      (select count(*)::int from event_chat c where c.event_id = e.id and c.volunteer_id is distinct from ${volunteerId}
         and c.created_at > coalesce((select last_read_at from event_chat_read r where r.event_id = e.id and r.reader = ${volunteerId}), 'epoch')) as unread,
      l.body as last_body, l.author_name as last_author, l.volunteer_id as last_vid, l.created_at as last_at
    from attendance a join event e on e.id = a.event_id join org o on o.id = e.org_id
    left join lateral (select body, author_name, volunteer_id, created_at from event_chat c where c.event_id = e.id order by created_at desc limit 1) l on true
    where a.volunteer_id = ${volunteerId} and a.status <> 'no_show' and e.is_practice = false
    order by l.created_at desc nulls last, e.starts_at desc
  `) as unknown as {
    id: string; title: string; starts_at: Date; location: string | null; org_id: string; org_name: string; members: number; unread: number;
    last_body: string | null; last_author: string | null; last_vid: string | null; last_at: Date | null;
  }[];
  return list.map((r) => ({
    event: { id: r.id, title: r.title, starts_at: r.starts_at, location: r.location },
    org: { id: r.org_id, name: r.org_name },
    members: r.members,
    unread: r.unread,
    last: r.last_at
      ? { author: r.last_vid === volunteerId ? 'You' : r.last_vid ? shortName(r.last_author!) : `${r.last_author} (coordinator)`, body: r.last_body!, created_at: r.last_at }
      : null,
  }));
}
