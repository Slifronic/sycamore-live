import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { orgChats } from '@/lib/event-chat';
import { ago, fmtTime, plural, requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Help } from '../Help';
import { Stagger } from '@/components/motion/Stagger';
import { Chip } from '@/components/ui/Chip';
import s from '../messages.module.css';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = {
  title: 'Event chats',
  description: 'A group chat for each event with the volunteers who checked in. Volunteers under 18 aren’t in event chats.',
};

const TZ = 'America/Los_Angeles';

export default async function EventChatsPage() {
  const org = await requireOrg('/org/messages/events');
  const chats = await orgChats(org.id);
  const now = requestNow();
  const active = chats.filter((c) => c.messages > 0 || c.members > 0);

  return (
    <Stagger className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={plural(active.filter((c) => c.messages > 0).length, 'active chat')}
        title="Event chats"
        lede="One group chat per event, for you and everyone who came."
        help={
          <Help label="About event chats" placement="bottom-end">
            <p>Parking notes, “we’re by the blue tent”, thank-yous. A chat opens as soon as people check in.</p>
            <p>Volunteers see each other as first name and last initial. Under-18s aren’t in group chats; an announcement reaches them.</p>
          </Help>
        }
      />
      <div className={s.chatList}>
        {active.map((c) => {
          const d = new Date(c.starts_at);
          const live = d.getTime() <= now && new Date(c.ends_at).getTime() > now;
          return (
            <Link key={c.event_id} href={`/org/messages/events/${c.event_id}`} className={`card hover-lift ${s.chatRow}`}>
              <span className={s.dateTile} aria-hidden>
                <span>{d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short' })}</span>
                <b>{d.toLocaleDateString('en-US', { timeZone: TZ, day: 'numeric' })}</b>
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="row" style={{ gap: 8 }}>
                  <strong>{c.title}</strong>
                  {live && (
                    <Chip tone="green" icon="live" className={s.mini18}>
                      Live now
                    </Chip>
                  )}
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
                  <span className="count-unread">
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
              icon="message"
              title="No event chats yet"
              hint="A chat opens as soon as people check in to an event."
              action={
                <Link className="btn btn-sm" href="/org/events">
                  Go to events
                </Link>
              }
            />
          </div>
        )}
      </div>
    </Stagger>
  );
}

export const instant = false;
