import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { getEvent } from '@/lib/org-data';
import { chatForOrg, chatMembers } from '@/lib/event-chat';
import { fmtDay, fmtTime, initials, plural, requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Help } from '../../Help';
import { Stagger } from '@/components/motion/Stagger';
import { Icon } from '@/components/shell/icons';
import { Chip } from '@/components/ui/Chip';
import { LiveInbox } from '../../LiveInbox';
import { ChatComposer } from '../ChatComposer';
import s from '../../messages.module.css';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Event chat' };

function dayLabel(d: Date, now: number) {
  const day = fmtDay(d);
  if (day === fmtDay(new Date(now))) return 'Today';
  if (day === fmtDay(new Date(now - 86_400_000))) return 'Yesterday';
  return day;
}

const STATUS = { checked_in: 'here now', checked_out: 'checked out', attested: 'verified' } as Record<string, string>;

export default async function EventChatPage({ params }: PageProps<'/org/messages/events/[id]'>) {
  const org = await requireOrg();
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event || event.is_practice) notFound();
  const now = requestNow();
  const [messages, members] = await Promise.all([chatForOrg(id), chatMembers(id)]);
  const [read] = (await sql`select last_read_at from event_chat_read where event_id = ${id} and reader = 'org'`) as unknown as { last_read_at: Date }[];
  const unreadMsgs = messages.filter((m) => m.author.kind === 'volunteer' && (!read || m.created_at > read.last_read_at));
  const firstUnread = unreadMsgs[0]?.id;
  const live = new Date(event.starts_at).getTime() <= now && new Date(event.ends_at).getTime() > now;

  return (
    <Stagger className="page" style={{ gap: 18 }}>
      <PageHeader
        eyebrow={
          <Link href="/org/messages/events" className={s.crumb}>
            <Icon name="chevron-left" size={14} strokeWidth={2} /> Event chats
          </Link>
        }
        title={event.title}
        lede={`${fmtDay(event.starts_at)} · ${fmtTime(event.starts_at)} to ${fmtTime(event.ends_at)}${event.location ? ` · ${event.location}` : ''}`}
        help={
          <Help label="About group chats" placement="bottom-end">
            <p>
              <strong>Everyone in the chat sees every post.</strong> For a one-to-one message, tap a member to open the inbox.
            </p>
            <p>Volunteers under 18 aren’t in group chats; an announcement reaches them.</p>
          </Help>
        }
        action={
          <Link className="btn" href={`/org/events/${id}`}>
            Event page
          </Link>
        }
      />

      <div className={`card ${s.chatLayout}`}>
        <section className={s.convo} aria-label="Group chat">
          <div className={s.convoHead}>
            <div className={s.convoWho}>
              <span className="avatar" aria-hidden>
                {initials(event.title)}
              </span>
              <div style={{ minWidth: 0 }}>
                <span className="row" style={{ gap: 8 }}>
                  <strong>Group chat</strong>
                  {live && (
                    <Chip tone="green" icon="live" className={s.mini18}>
                      Live now
                    </Chip>
                  )}
                </span>
                <div className={s.facts}>
                  <span>
                    <b>{members.length}</b> volunteers + you
                  </span>
                  <span>{plural(messages.length, 'message')}</span>
                </div>
              </div>
            </div>
            <Link className="btn btn-sm" href={`/org/messages/broadcasts?new=1&event=${id}`} aria-label="Send an announcement instead">
              <Icon name="megaphone" size={16} />
              <span className={s.hideNarrow}>Announce instead</span>
            </Link>
          </div>
          <div className={s.stream} id="chat-stream" aria-live="polite">
            {messages.length === 0 && (
              <div className={s.empty}>
                <EmptyState compact icon="message" title="No posts yet" hint="Say hi, share where to park, or post a thank-you after." />
              </div>
            )}
            {messages.map((m, i) => {
              const day = fmtDay(m.created_at);
              const newDay = i === 0 || fmtDay(messages[i - 1].created_at) !== day;
              const mine = m.author.kind === 'org';
              const sameAuthor = i > 0 && !newDay && messages[i - 1].author.name === m.author.name;
              return (
                <div key={m.id} style={{ display: 'contents' }}>
                  {newDay && <div className={s.dayRule}>{dayLabel(m.created_at, now)}</div>}
                  {m.id === firstUnread && <div className={s.newRule}>{unreadMsgs.length} new</div>}
                  {!sameAuthor && <div className={`${s.author} ${mine ? s.authorOut : ''}`}>{mine ? `${m.author.name} (you)` : m.author.name}</div>}
                  <div className={`${s.bubble} ${mine ? s.out : s.in}`}>{m.body}</div>
                  <div className={`${s.stamp} ${mine ? s.stampOut : ''}`}>{fmtTime(m.created_at)}</div>
                </div>
              );
            })}
          </div>
          <ChatComposer eventId={id} people={members.length} />
        </section>
        <aside className={s.members} aria-label="Members">
          <div className="eyebrow">Members · {members.length + 1}</div>
          <div className={s.member}>
            <span className="avatar">{initials(org.coordinator_name)}</span>
            <span>
              <strong>{org.coordinator_name}</strong>
              <br />
              <span className="small muted">coordinator</span>
            </span>
          </div>
          {members
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((m) => (
              <Link key={m.volunteer_id} href={`/org/messages?v=${m.volunteer_id}`} className={s.member} style={{ textDecoration: 'none', color: 'inherit' }} title={`Message ${m.name} privately`}>
                <span className="avatar">{initials(m.name)}</span>
                <span>
                  {m.name}
                  <br />
                  <span className="small muted">{STATUS[m.status] ?? m.status}</span>
                </span>
              </Link>
            ))}
        </aside>
      </div>
      <LiveInbox openId={id} lastUnreadId={unreadMsgs.at(-1)?.id ?? null} streamId="chat-stream" kind="chat" />
    </Stagger>
  );
}

export const instant = false;
