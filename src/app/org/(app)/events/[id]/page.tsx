import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { ACTIVITY_LABEL } from '@/lib/types';
import { fmtDay, fmtTime } from '@/lib/format';
import { EventDay } from './EventDay';
import { sheetImportEnabled } from '@/lib/sheet-import';
import { requestNow } from '@/lib/format';

export default async function EventPage({ params, searchParams }: PageProps<'/org/events/[id]'>) {
  const org = await requireOrg();
  const { id } = await params;
  const created = (await searchParams).created === '1';
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const roster = await getRoster(id);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/checkin?code=${event.checkin_code}`;
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } });
  const ended = new Date(event.ends_at).getTime() < requestNow();

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 1120 }}>
      <header className="row between wrap">
        <div>
          <p className="small muted">
            <Link href="/org/events">Events</Link> / {event.is_practice ? 'Practice' : ACTIVITY_LABEL[event.activity]}
          </p>
          <h1>{event.title}</h1>
          <p className="muted">
            {fmtDay(event.starts_at)} · {fmtTime(event.starts_at)} to {fmtTime(event.ends_at)}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        {event.attested_at ? (
          <span className="chip chip-green" style={{ height: 32 }}>✓ Verified · records issued</span>
        ) : (
          <Link className={`btn btn-big ${ended || event.is_practice ? 'btn-primary' : ''}`} href={`/org/events/${id}/verify`}>
            Close & verify
          </Link>
        )}
      </header>
      {created && (
        <p className="notice notice-green">
          <strong>Event created.</strong> On the day, tap “Show QR full screen” and set your phone or laptop on the sign-in table. That’s it.
        </p>
      )}
      <EventDay
        eventId={id}
        code={event.checkin_code}
        qrSvg={qr}
        url={url}
        practice={event.is_practice}
        verified={!!event.attested_at}
        initial={JSON.parse(JSON.stringify(roster))}
        aiEnabled={sheetImportEnabled()}
        eventDate={new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(event.starts_at)}
      />
    </div>
  );
}

export const instant = false;
