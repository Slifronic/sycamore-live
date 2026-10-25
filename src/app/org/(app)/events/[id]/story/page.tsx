import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { getCampaign, getClips, getNotes, publishBlockers, storyEnabled, storyFacts } from '@/lib/story';
import { fmtDay } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StoryStudio } from './StoryStudio';

export const metadata = { title: 'Event story' };

export default async function StoryPage({ params }: PageProps<'/org/events/[id]/story'>) {
  const org = await requireOrg();
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const [notes, clips, campaign, facts] = await Promise.all([getNotes(id), getClips(id), getCampaign(id), storyFacts(org, event)]);

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={
          <span className="row" style={{ gap: 8 }}>
            <Link href={`/org/events/${id}`}>{event.title}</Link>
            <span aria-hidden>·</span>
            {fmtDay(event.starts_at)}
          </span>
        }
        title="Event story"
        lede="Talk through what happened and add the videos people took. Claude turns them into a campaign you edit and publish. The numbers always come from your verified record."
        action={
          event.attested_at ? (
            <span className="chip chip-green" style={{ height: 32 }}>✓ Verified · {facts.volunteers} volunteers · {facts.verified_hours} hours</span>
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
    </div>
  );
}

export const instant = false;
