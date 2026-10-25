import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { isUuid } from '@/lib/ids';
import { ACTIVITY_LABEL } from '@/lib/types';
import { fmtDay, fmtTime } from '@/lib/format';
import { EventDay } from './EventDay';
import { PageHeader } from '@/components/PageHeader';
import s from './event.module.css';
import { sheetImportEnabled } from '@/lib/sheet-import';
import { requestNow } from '@/lib/format';
import { orgChats } from '@/lib/event-chat';
import { ensureWalkinToken } from '@/lib/walkin';
import { walkinPanel } from '@/lib/walkin-panel';
import { tagsForEvents } from '@/lib/event-intake';
import { announcement, eventLinks } from '@/lib/event-public';
import { SharePanel } from '@/components/events/SharePanel';
import { Cover } from '@/components/media/Cover';
import { coverFor } from '@/lib/covers';

export const metadata = { title: 'Event day' };

export default async function EventPage({ params, searchParams }: PageProps<'/org/events/[id]'>) {
  const org = await requireOrg();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const created = (await searchParams).created === '1';
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const [roster, tagMap] = await Promise.all([getRoster(id), tagsForEvents([id])]);
  const tags = tagMap.get(id) ?? [];
  const links = eventLinks(event);
  const saved = (await searchParams).saved === '1';
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/checkin?code=${event.checkin_code}`;
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } });
  const now = requestNow();
  const ended = new Date(event.ends_at).getTime() < now;
  const live = !event.attested_at && !ended && new Date(event.starts_at).getTime() <= now;
  const chat = (await orgChats(org.id)).find((c) => c.event_id === id) ?? { messages: 0, unread: 0 };
  // Walk-in sign-up QR (not for practice events or ones already verified).
  const walkinToken = event.is_practice || event.attested_at ? null : await ensureWalkinToken(org.id, id);
  const walkin = walkinToken ? await walkinPanel({ ...event, walkin_token: walkinToken }) : null;

  // Before the day, sharing the event is the job, so it comes first; on the day, the QR code is.
  const share = !event.is_practice && !event.attested_at && !ended;
  const sharePanel = <SharePanel url={links.page} title={event.title} announcement={announcement(event, org.name)} links={{ google: links.google, ics: links.ics, outlook: links.outlook }} />;

  return (
    <div className="page" style={{ gap: 20 }}>
      {!event.is_practice && <Cover cover={coverFor({ title: event.title, activity: event.activity, tags })} variant="band" priority className={`${s.band} no-print`} />}
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
            {event.location ? (
              <>
                {' · '}
                {links.directions ? (
                  <a href={links.directions} target="_blank" rel="noopener">
                    {event.location}
                  </a>
                ) : (
                  event.location
                )}
              </>
            ) : (
              ''
            )}
            {tags.length > 0 && (
              <span className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                {tags.map((t) => (
                  <Link key={t.id} href={`/org/events?tag=${encodeURIComponent(t.name)}`} className={`tag tag-${t.color}`} style={{ textDecoration: 'none' }}>
                    {t.name}
                  </Link>
                ))}
              </span>
            )}
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
        <nav className="row wrap" style={{ gap: 8 }} aria-label="This event">
          {!event.attested_at && (
            <Link className="btn btn-sm" href={`/org/events/${id}/edit`}>
              ✎ Edit details
            </Link>
          )}
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
      {saved && <p className="notice notice-green">Saved. The event page and calendar feeds show the new details.</p>}
      {created && (
        <p className="notice notice-green">
          <strong>Event created.</strong> Share the link below in your group chats now. On the day, tap “Show QR full screen” and set your phone or laptop on the sign-in table. That’s it.
        </p>
      )}
      {share && !live && sharePanel}
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
        walkin={walkin}
        now={now}
      />
      {share && live && sharePanel}
    </div>
  );
}

export const instant = false;
