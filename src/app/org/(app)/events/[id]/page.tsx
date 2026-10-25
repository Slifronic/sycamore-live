import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { requireOrg } from '@/lib/session';
import { getEvent, getRoster } from '@/lib/org-data';
import { isUuid } from '@/lib/ids';
import { ACTIVITY_LABEL } from '@/lib/types';
import { fmtDay, fmtTime } from '@/lib/format';
import { utcToPacific } from '@/lib/tz';
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
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { ToastOnMount } from '@/components/shell/Toast';

export const metadata = { title: 'Event day' };

export default async function EventPage({ params, searchParams }: PageProps<'/org/events/[id]'>) {
  const org = await requireOrg();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const created = sp.created === '1';
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const [roster, tagMap] = await Promise.all([getRoster(id), tagsForEvents([id])]);
  const tags = tagMap.get(id) ?? [];
  const links = eventLinks(event);
  const saved = sp.saved === '1';
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
  // On the day itself (or while it's live), phones lead with the QR code: this event's other links move below the roster.
  const dayOf = !event.is_practice && !event.attested_at && (live || utcToPacific(new Date(event.starts_at)).ymd === utcToPacific(new Date(now)).ymd);
  const sharePanel = <SharePanel url={links.page} title={event.title} announcement={announcement(event, org.name)} links={{ google: links.google, ics: links.ics, outlook: links.outlook }} />;

  const importOpen = sp.import === '1' && !event.attested_at;
  const when = `${fmtDay(event.starts_at)} · ${fmtTime(event.starts_at)} – ${fmtTime(event.ends_at)}`;

  return (
    <Stagger className={`page ${s.page}`}>
      {saved && <ToastOnMount id={`saved-${id}`} message="Event saved" body="The event page and calendar feeds show the new details." />}
      {created && <ToastOnMount id={`created-${id}`} message="Event created" body="Share the link with volunteers. On the day, show the QR full screen." />}
      {!event.is_practice && <Cover cover={coverFor({ title: event.title, activity: event.activity, tags })} variant="band" priority className={`${s.band} no-print`} />}
      <PageHeader
        eyebrow={
          <span className={s.eyebrow}>
            {live ? (
              <>
                <span className={s.liveDot} aria-hidden />
                <span style={{ color: 'var(--primary)' }}>Live now</span>
              </>
            ) : event.attested_at ? (
              <span style={{ color: 'var(--verified)' }}>Verified · records issued</span>
            ) : (
              <Link href="/org/events">Events</Link>
            )}
            <span aria-hidden>·</span>
            {event.is_practice ? 'Practice' : ACTIVITY_LABEL[event.activity]}
          </span>
        }
        title={event.title}
        action={
          event.attested_at ? (
            <Link className="btn btn-primary" href={`/org/events/${id}/story`}>
              Tell the story <Icon name="arrow-right" size={16} />
            </Link>
          ) : ended || event.is_practice ? (
            <Link className="btn btn-primary" href={`/org/events/${id}/verify`}>
              <Icon name="check" size={16} /> Close &amp; verify
            </Link>
          ) : (
            // While the event runs, closing it is a quiet option; the QR is the job.
            <Link className="btn btn-sm btn-quiet" href={`/org/events/${id}/verify`}>
              Close &amp; verify early
            </Link>
          )
        }
      />

      {/* The event's facts as one row of properties, with its quick links on the right. */}
      <div className={`${s.meta} ${dayOf ? s.dayNav : ''}`}>
        <ul className={s.props} aria-label="Details">
          <li>
            <Icon name="calendar" size={16} />
            <span className="num">{when}</span>
          </li>
          {event.location && (
            <li>
              <Icon name="pin" size={16} />
              {links.directions ? (
                <a href={links.directions} target="_blank" rel="noopener">
                  {event.location}
                </a>
              ) : (
                <span>{event.location}</span>
              )}
            </li>
          )}
          {event.goal_text && (
            <li>
              <Icon name="leaf" size={16} />
              <span>
                Goal: <strong>{event.goal_text}</strong>
              </span>
            </li>
          )}
          {tags.map((t) => (
            <li key={t.id} className={s.tagItem}>
              {/* The link is a full finger tall; the tag inside keeps its small look. */}
              <Link href={`/org/events?tag=${encodeURIComponent(t.name)}`} className={s.tagLink}>
                <span className={`tag tag-${t.color}`}>{t.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        {!event.is_practice && (
          <nav className={s.quick} aria-label="This event">
            {!event.attested_at && (
              <Link className="btn btn-sm btn-quiet" href={`/org/events/${id}/edit`}>
                Edit
              </Link>
            )}
            <Link className="btn btn-sm btn-quiet" href={`/org/messages/broadcasts?new=1&event=${id}`}>
              <Icon name="megaphone" size={16} /> Announce
            </Link>
            <Link className="btn btn-sm btn-quiet" href={`/org/messages/events/${id}`}>
              <Icon name="message" size={16} /> Chat
              {chat.unread > 0 ? (
                <span className={s.unread}>{chat.unread} new</span>
              ) : (
                chat.messages > 0 && <span className={s.count}>{chat.messages}</span>
              )}
            </Link>
            {ended && !event.attested_at && (
              <Link className="btn btn-sm btn-quiet" href={`/org/events/${id}/story`}>
                Debrief
              </Link>
            )}
          </nav>
        )}
      </div>

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
        importOpen={importOpen}
      />
      {share && live && sharePanel}
    </Stagger>
  );
}

export const instant = false;
