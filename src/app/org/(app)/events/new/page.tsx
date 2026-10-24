import { connection } from 'next/server';
import { requireOrg } from '@/lib/session';
import { listTags, pastEvents, repeatDraft } from '@/lib/event-intake';
import { intakeAiEnabled } from '@/lib/intake-ai';
import { utcToPacific } from '@/lib/tz';
import { fmtDay } from '@/lib/format';
import { createEventFull } from '@/app/org/event-actions';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/PageHeader';

export default async function NewEventPage({ searchParams }: PageProps<'/org/events/new'>) {
  await connection(); // "today" is the request's date, not the build's
  const org = await requireOrg();
  const today = utcToPacific(new Date()).ymd;
  const asked = (await searchParams).date;
  const date = typeof asked === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked >= today ? asked : today;
  const [tags, past] = await Promise.all([listTags(org.id), pastEvents(org.id)]);
  const repeats = past
    .sort((a, b) => b.starts_at.getTime() - a.starts_at.getTime())
    .slice(0, 12)
    .map((p) => ({ label: `${p.title} (${fmtDay(p.starts_at)})`, draft: repeatDraft(p, today) }));

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow="Run events"
        title="New event"
        lede="Bring it in from a calendar invite, a link, a message or a flyer, or just type it. Keep using your usual sign-up tool for who’s coming."
      />
      <EventForm
        mode="new"
        action={createEventFull}
        aiEnabled={intakeAiEnabled()}
        orgName={org.name}
        tagOptions={tags.map((t) => ({ name: t.name, color: t.color }))}
        repeats={JSON.parse(JSON.stringify(repeats))}
        initial={{ title: '', date, start: '09:00', end: '12:00', location: '', place: null, notes: '', goal: '', activity: 'general', tags: [], source: 'manual', source_uid: null, use_for_site: false }}
      />
    </div>
  );
}

export const instant = false;
