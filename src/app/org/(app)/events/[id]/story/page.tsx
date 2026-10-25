import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { getCampaign, getClips, getNotes, publishBlockers, storyEnabled, storyFacts } from '@/lib/story';
import { fmtDay } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StoryStudio } from './StoryStudio';
import { Chip } from '@/components/ui/Chip';
import { Stagger } from '@/components/motion/Stagger';
import { orgEventMeta } from '@/lib/page-meta';

export async function generateMetadata({ params }: PageProps<'/org/events/[id]/story'>) {
  const { id } = await params;
  return orgEventMeta(id, (t) => ({ title: `Story · ${t}`, description: `Record a voice debrief and add clips for ${t}; Claude drafts a campaign from the verified facts for you to edit and publish.` }), { title: 'Event story', description: 'Record a voice debrief and add clips; Claude drafts a campaign from the verified facts for you to edit and publish.' });
}

export default async function StoryPage({ params }: PageProps<'/org/events/[id]/story'>) {
  const { id } = await params;
  const org = await requireOrg(`/org/events/${id}/story`);
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const [notes, clips, campaign, facts] = await Promise.all([getNotes(id), getClips(id), getCampaign(id), storyFacts(org, event)]);

  return (
    <Stagger className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={
          <span className="row" style={{ gap: 8 }}>
            <Link href={`/org/events/${id}`}>{event.title}</Link>
            <span aria-hidden>·</span>
            {fmtDay(event.starts_at)}
          </span>
        }
        title="Event story"
        lede="Your notes and videos become a campaign. Every number comes from the verified record."
        action={
          event.attested_at ? (
            <Chip tone="green" icon="check">
              Verified · {facts.volunteers} volunteers · {facts.verified_hours} hours
            </Chip>
          ) : (
            <Link className="btn btn-sm" href={`/org/events/${id}/verify`}>
              Verify the event to publish
            </Link>
          )
        }
      />
      <StoryStudio
        eventId={id}
        eventTitle={event.title}
        verified={!!event.attested_at}
        aiEnabled={storyEnabled()}
        initial={JSON.parse(JSON.stringify({ notes, clips, campaign, facts, blockers: publishBlockers(campaign, event) }))}
      />
    </Stagger>
  );
}

export const instant = false;
