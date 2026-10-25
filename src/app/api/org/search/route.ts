import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { sql } from '@/lib/db';

// The command palette's index (shell/CommandPalette.tsx): the signed-in
// org's events (title, date, state) and the people who have come to them.
// Scoped by the coordinator cookie; nothing from another org can appear.
export async function GET() {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const now = Date.now();
  const events = (await sql`
    select id, title, starts_at, ends_at, attested_at, is_practice
    from event where org_id = ${org.id}
    order by starts_at desc limit 400
  `) as unknown as { id: string; title: string; starts_at: Date; ends_at: Date; attested_at: Date | null; is_practice: boolean }[];
  const people = (await sql`
    select coalesce(a.volunteer_id::text, 'name:' || lower(trim(a.display_name))) as key,
           max(a.display_name) as name, count(*)::int as events
    from attendance a join event e on e.id = a.event_id
    where e.org_id = ${org.id} and e.is_practice = false
    group by 1 order by max(e.starts_at) desc limit 600
  `) as unknown as { key: string; name: string; events: number }[];

  return NextResponse.json(
    {
      events: events.map((e) => {
        const start = new Date(e.starts_at).getTime();
        const end = new Date(e.ends_at).getTime();
        const state = e.attested_at ? 'verified' : start <= now && end >= now ? 'live' : end < now ? 'waiting' : 'upcoming';
        return { id: e.id, title: e.title, starts_at: new Date(e.starts_at).toISOString(), state, practice: e.is_practice };
      }),
      volunteers: people.map((p) => ({ key: p.key, name: p.name, events: p.events })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
