import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { ACTIVITY_LABEL } from '@/lib/types';
import { fmtDay, fmtTime } from '@/lib/format';
import { EventDay } from './EventDay';
import { PageHeader } from '@/components/PageHeader';
import s from './event.module.css';
import { sheetImportEnabled } from '@/lib/sheet-import';
import { requestNow } from '@/lib/format';
import { orgChats } from '@/lib/event-chat';

export default async function EventPage({ params, searchParams }: PageProps<'/org/events/[id]'>) {
  const org = await requireOrg();
  const { id } = await params;
  const created = (await searchParams).created === '1';
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const roster = await getRoster(id);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/checkin?code=${event.checkin_code}`;
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } });
  const now = requestNow();
  const ended = new Date(event.ends_at).getTime() < now;
  const live = !event.attested_at && !ended && new Date(event.starts_at).getTime() <= now;
  const chat = (await orgChats(org.id)).find((c) => c.event_id === id) ?? { messages: 0, unread: 0 };

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={
          <span className="row" style={{ gap: 8 }}>
            {live && <span className={s.liveDot} aria-hidden />}
            {live ? <span style={{ color: 'var(--primary)' }}>Live</span> : <Link href="/org/events">Events</Link>}
            <span aria-hidden>·</span>
            {event.is_practice ? 'Practice' : ACTIVITY_LABEL[event.activity]}
          </span>
        }
        title={event.title}
        lede={
          <>
            {fmtDay(event.starts_at)} · {fmtTime(event.starts_at)} to {fmtTime(event.ends_at)}
            {event.location ? ` · ${event.location}` : ''}
            {event.goal_text && (
              <>
                <br />
                Goal: <strong style={{ color: 'var(--ink)' }}>{event.goal_text}</strong>
              </>
            )}
          </>
        }
        action={
          event.attested_at ? (
            <span className="row wrap" style={{ gap: 8 }}>
              <span className="chip chip-green" style={{ height: 32 }}>✓ Verified · records issued</span>
              <Link className="btn btn-big btn-primary" href={`/org/events/${id}/story`}>
                🎙 Tell the story
              </Link>
            </span>
          ) : ended || event.is_practice ? (
            <span className="row wrap" style={{ gap: 8 }}>
              <Link className="btn btn-big" href={`/org/events/${id}/story`}>
                🎙 Record a debrief
              </Link>
              <Link className="btn btn-big btn-primary" href={`/org/events/${id}/verify`}>
                Close & verify
              </Link>
            </span>
          ) : (
            // While the event runs, closing it is a quiet option; the QR is the job.
            <Link className="btn btn-sm" href={`/org/events/${id}/verify`}>
              Close & verify early
            </Link>
          )
        }
      />
      {!event.is_practice && (
        <nav className="row wrap" style={{ gap: 8 }} aria-label="Message this event’s volunteers">
          <Link className="btn btn-sm" href={`/org/messages/broadcasts?new=1&event=${id}`}>
            📣 Send announcement
          </Link>
          <Link className="btn btn-sm" href={`/org/messages/events/${id}`}>
            💬 Group chat
            {chat.messages > 0 && <span className="muted"> · {chat.messages}</span>}
            {chat.unread > 0 && <span className="chip chip-red" style={{ height: 20, fontSize: 11 }}>{chat.unread} new</span>}
          </Link>
        </nav>
      )}
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
        site={{ lat: event.site_lat, lng: event.site_lng, radius_m: event.site_radius_m }}
      />
    </div>
  );
}

export const instant = false;
