import { connection } from 'next/server';
import { NewEventForm } from './NewEventForm';

export default async function NewEventPage() {
  await connection(); // "today" is the request's date, not the build's
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  return (
    <div className="stack" style={{ gap: 20, maxWidth: 640 }}>
      <header>
        <h1>New event</h1>
        <p className="muted">That’s all we need. Keep using your usual sign-up tool for who’s coming.</p>
      </header>
      <NewEventForm today={today} />
    </div>
  );
}

export const instant = false;
