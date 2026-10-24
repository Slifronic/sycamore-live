import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { isUuid } from '@/lib/ids';
import { getEvent } from '@/lib/org-data';
import { checkNumbers, getCampaign, getNotes, newSlug, publishBlockers, saveCampaign, storyFacts, type Campaign } from '@/lib/story';

// Publish to /c/<slug>. Only after verification, with every number traced.
export async function POST(_req: Request, { params }: RouteContext<'/api/org/events/[id]/story/campaign/publish'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const event = await getEvent(org.id, id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  // Check the numbers again against the record as it is now; saved flags may be stale.
  const saved = await getCampaign(id);
  let current = saved;
  if (saved) {
    const [facts, notes] = await Promise.all([storyFacts(org, event), getNotes(id)]);
    current = await saveCampaign(org.id, id, saved.draft, facts, checkNumbers(saved.draft, facts, notes));
  }
  const blockers = publishBlockers(current, event);
  if (blockers.length) return NextResponse.json({ error: blockers[0], blockers }, { status: 409 });
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [campaign] = (await sql`
        update campaign set status = 'published', published_at = now(), slug = coalesce(slug, ${newSlug(event.title)})
        where event_id = ${id} and org_id = ${org.id} and jsonb_array_length(flags) = 0 returning *
      `) as unknown as Campaign[];
      if (!campaign) return NextResponse.json({ error: 'A number changed while publishing. Check the flags and try again.' }, { status: 409 });
      return NextResponse.json({ campaign, url: `/c/${campaign.slug}` });
    } catch (e) {
      if (!String(e).includes('slug')) throw e; // retry only on a slug collision
    }
  }
  throw new Error('Could not generate a unique campaign link');
}

// Take the public page down (the draft stays).
export async function DELETE(_req: Request, { params }: RouteContext<'/api/org/events/[id]/story/campaign/publish'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const [campaign] = (await sql`
    update campaign set status = 'draft' where event_id = ${id} and org_id = ${org.id} returning *
  `) as unknown as Campaign[];
  if (!campaign) return NextResponse.json({ error: 'No campaign yet.' }, { status: 404 });
  return NextResponse.json({ campaign });
}
