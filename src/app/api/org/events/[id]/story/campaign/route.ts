import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import {
  checkNumbers, cleanDraft, composeCampaign, DraftInput, getCampaign, getClips, getNotes, saveCampaign, storyFacts, StoryError,
} from '@/lib/story';

async function load(req: RouteContext<'/api/org/events/[id]/story/campaign'>['params']) {
  const org = await currentOrg();
  if (!org) return { error: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) };
  const { id } = await req;
  const event = await getEvent(org.id, id);
  if (!event) return { error: NextResponse.json({ error: 'Event not found.' }, { status: 404 }) };
  return { org, event };
}

// Draft (or redraft) the campaign with Claude from the debrief, clips and verified facts.
export async function POST(_req: Request, { params }: RouteContext<'/api/org/events/[id]/story/campaign'>) {
  const ctx = await load(params);
  if ('error' in ctx) return ctx.error;
  const { org, event } = ctx;
  const [notes, clips] = await Promise.all([getNotes(event.id), getClips(event.id)]);
  if (!notes.length && !clips.length) return NextResponse.json({ error: 'Record a voice note or add a video first.' }, { status: 400 });
  const facts = await storyFacts(org, event);
  try {
    const draft = await composeCampaign(facts, notes, clips);
    const campaign = await saveCampaign(org.id, event.id, draft, facts, checkNumbers(draft, facts, notes));
    return NextResponse.json({ campaign });
  } catch (e) {
    if (e instanceof StoryError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}

// Save the coordinator's edits. The same checks run again, so an edit can't sneak in a number.
export async function PATCH(req: Request, { params }: RouteContext<'/api/org/events/[id]/story/campaign'>) {
  const ctx = await load(params);
  if ('error' in ctx) return ctx.error;
  const { org, event } = ctx;
  const body = DraftInput.safeParse((await req.json().catch(() => null))?.draft);
  if (!body.success) return NextResponse.json({ error: 'That draft is missing fields.' }, { status: 400 });
  if (!(await getCampaign(event.id))) return NextResponse.json({ error: 'Draft the campaign first.' }, { status: 409 });
  const [notes, clips] = await Promise.all([getNotes(event.id), getClips(event.id)]);
  const facts = await storyFacts(org, event);
  const draft = cleanDraft(body.data, notes, clips);
  const campaign = await saveCampaign(org.id, event.id, draft, facts, checkNumbers(draft, facts, notes));
  return NextResponse.json({ campaign });
}
