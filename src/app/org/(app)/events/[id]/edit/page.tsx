import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { listTags, tagsForEvents } from '@/lib/event-intake';
import { intakeAiEnabled } from '@/lib/intake-ai';
import { utcToPacific } from '@/lib/tz';
import { updateEventFull } from '@/app/org/event-actions';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/PageHeader';
import { orgEventMeta } from '@/lib/page-meta';

export async function generateMetadata({ params }: PageProps<'/org/events/[id]/edit'>) {
  const { id } = await params;
  return orgEventMeta(id, (t) => ({ title: `Edit ${t}`, description: `Change the name, time, place, notes or tags for ${t}. The public page and calendar feeds pick it up.` }), { title: 'Edit event', description: 'Change an event’s name, time, place, notes or tags. The public page and calendar feeds pick it up.' });
}

export default async function EditEventPage({ params }: PageProps<'/org/events/[id]/edit'>) {
  const { id } = await params;
  const org = await requireOrg(`/org/events/${id}/edit`);
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  if (event.attested_at) redirect(`/org/events/${id}`);
  const [tags, tagMap] = await Promise.all([listTags(org.id), tagsForEvents([id])]);
  const s = utcToPacific(event.starts_at);
  const e = utcToPacific(event.ends_at);
  const place =
    event.place_lat != null && event.place_lng != null
      ? { name: event.place_name ?? event.location ?? 'Event location', address: event.place_address ?? '', lat: event.place_lat, lng: event.place_lng, url: event.place_url }
      : null;

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader eyebrow={<Link href={`/org/events/${id}`}>{event.title}</Link>} title="Edit details" lede="Changes reach the shared page and calendars on their next refresh." />
      <EventForm
        mode="edit"
        action={updateEventFull.bind(null, id)}
        aiEnabled={intakeAiEnabled()}
        orgName={org.name}
        tagOptions={tags.map((t) => ({ name: t.name, color: t.color }))}
        initial={{
          title: event.title,
          date: s.ymd,
          start: s.hhmm,
          end: e.hhmm,
          location: event.location ?? '',
          place,
          notes: event.volunteer_notes ?? '',
          goal: event.goal_text ?? '',
          activity: event.activity,
          tags: (tagMap.get(id) ?? []).map((t) => t.name),
          source: event.source,
          source_uid: event.source_uid,
          use_for_site: event.site_lat != null && place != null && event.site_lat === place.lat && event.site_lng === place.lng,
        }}
      />
    </div>
  );
}

export const instant = false;
