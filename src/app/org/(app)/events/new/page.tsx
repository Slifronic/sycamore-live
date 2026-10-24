import { connection } from 'next/server';
import { NewEventForm } from './NewEventForm';
import { PageHeader } from '@/components/PageHeader';

export default async function NewEventPage() {
  await connection(); // "today" is the request's date, not the build's
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  return (
    <div className="stack" style={{ gap: 20, maxWidth: 640 }}>
      <PageHeader eyebrow="Run events" title="New event" lede="That’s all we need. Keep using your usual sign-up tool for who’s coming." />
      <NewEventForm today={today} />
    </div>
  );
}

export const instant = false;
