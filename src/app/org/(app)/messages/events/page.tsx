import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { unreadCount } from '@/lib/messages';
import { orgChats } from '@/lib/event-chat';
import { ago, fmtTime, plural, requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { MessagesTabs } from '../MessagesTabs';
import s from '../messages.module.css';
import { EmptyState } from '@/components/media/EmptyState';

const TZ = 'America/Los_Angeles';

export default async function EventChatsPage() {
  const org = await requireOrg();
  const [chats, unread] = await Promise.all([orgChats(org.id), unreadCount(org.id)]);
  const now = requestNow();
  const chatUnread = chats.reduce((n, c) => n + c.unread, 0);
  const active = chats.filter((c) => c.messages > 0 || c.members > 0);

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={`People · ${plural(active.filter((c) => c.messages > 0).length, 'active chat')}`}
        title="Event chats"
        lede="One group chat per event, for you and everyone who came. Parking notes, “we’re by the blue tent”, thank-yous. Volunteers see each other as first name and last initial."
        action={<MessagesTabs on="events" unread={unread} chatUnread={chatUnread} />}
      />
      <div className={s.chatList}>
        {active.map((c) => {
          const d = new Date(c.starts_at);
          const live = d.getTime() <= now && new Date(c.ends_at).getTime() > now;
          return (
            <Link key={c.event_id} href={`/org/messages/events/${c.event_id}`} className={`card ${s.chatRow}`}>
              <span className={s.dateTile} aria-hidden>
                <span>{d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short' })}</span>
                <b>{d.toLocaleDateString('en-US', { timeZone: TZ, day: 'numeric' })}</b>
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="row" style={{ gap: 8 }}>
                  <strong>{c.title}</strong>
                  {live && <span className="chip chip-green" style={{ height: 20, fontSize: 11 }}>Live now</span>}
                </span>
                <span className="small muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.last_body ? `${c.last_author?.split(' ')[0]}: ${c.last_body}` : `No messages yet · ${plural(c.members, 'person', 'people')} can join`}
                </span>
              </span>
              <span className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <span className="small muted">
                  {plural(c.members, 'member')}
                  {c.last_at ? ` · ${ago(c.last_at) === 'today' ? fmtTime(c.last_at) : ago(c.last_at)}` : ''}
                </span>
                {c.unread > 0 && (
                  <span className={s.badge}>
                    {c.unread}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </span>
            </Link>
          );
        })}
        {active.length === 0 && (
          <div className="card">
            <EmptyState
              compact
              illo="envelope"
              title="No event chats yet."
              action={
                <Link className="btn btn-sm" href="/org/events">
                  Go to events
                </Link>
              }
            >
              Event chats open as soon as people check in to an event.
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}

export const instant = false;
