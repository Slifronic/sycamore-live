import Link from 'next/link';
import { requireVolunteer } from '@/lib/vol-data';
import { volunteerThreads, type VolThread } from '@/lib/messages';
import { chatForVolunteer, chatMembers, isMember, shortName, volunteerChats } from '@/lib/event-chat';
import { isUuid } from '@/lib/ids';
import { MINOR_CHAT_OFF, MINOR_MESSAGES_OFF } from '@/lib/minors';
import { fmtDay, fmtTime } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Composer, LiveThread } from './MessagesClient';
import s from './messages.module.css';

// Messages, the volunteer's half of the coordinator inbox. One thread per
// organization (direct notes, broadcasts, automatic messages) and one group
// chat per event they came to. Data comes from lib/messages.ts and
// lib/event-chat.ts; replies and "read" go through /api/vol/messages and
// /api/vol/event-chats, so the rules (only orgs you've served with, members
// only, names as "Ana R.", nothing for volunteers under 18 but one-way
// announcements) live in one place.

const dayLabel = (d: Date) => {
  const ymd = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const today = new Date();
  if (ymd(d) === ymd(today)) return 'Today';
  if (ymd(d) === ymd(new Date(today.getTime() - 86_400_000))) return 'Yesterday';
  return fmtDay(d);
};

// Automatic messages point at screens; give them a button, never act on their own.
function actionsFor(body: string) {
  const out: { href: string; label: string }[] = [];
  if (/check(ed)? ?out/i.test(body)) out.push({ href: '/checkin', label: 'Check out' });
  if (/my hours|verified|on your record/i.test(body)) out.push({ href: '/me', label: 'Open My hours' });
  return out;
}

const SOURCE_LABEL = { broadcast: 'Sent to a group', automation: 'Automatic', direct: null } as const;

export default async function MessagesPage({ searchParams }: PageProps<'/me/messages'>) {
  const sp = await searchParams;
  const orgId = typeof sp.org === 'string' && isUuid(sp.org) ? sp.org : null;
  const eventId = !orgId && typeof sp.event === 'string' && isUuid(sp.event) ? sp.event : null;
  const vol = await requireVolunteer(orgId ? `/me/messages?org=${orgId}` : eventId ? `/me/messages?event=${eventId}` : '/me/messages');
  const [threads, chats] = await Promise.all([volunteerThreads(vol.id), volunteerChats(vol.id)]);

  const thread = orgId ? threads.find((t) => t.org.id === orgId) ?? null : null;
  const chatSummary = eventId ? chats.find((c) => c.event.id === eventId) ?? null : null;
  const canChat = chatSummary && (await isMember(chatSummary.event.id, vol.id));
  const open = !!(thread || canChat);

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Messages"
        title="Messages"
        lede={vol.is_minor ? 'Announcements from the organizations you volunteer with. No phone numbers change hands.' : 'Notes from your coordinators and the group chat for each event you came to. No phone numbers change hands.'}
        className={open ? s.hideOnPhone : ''}
      />
      <div className={`${s.inbox} ${open ? s.isOpen : ''}`}>
        <nav className={`card ${s.list}`} aria-label="Conversations">
          <p className={s.listLabel}>Organizations</p>
          {threads.length === 0 && (
            <p className="small muted" style={{ padding: '4px 14px 12px' }}>{vol.is_minor ? 'Announcements from an organization show up here.' : 'When a coordinator writes to you, it shows up here.'}</p>
          )}
          {threads.map((t) => {
            const last = t.messages.at(-1)!;
            return (
              <Link key={t.org.id} href={`/me/messages?org=${t.org.id}`} className={s.row} aria-current={t.org.id === orgId ? 'page' : undefined}>
                <span className={s.rowTop}>
                  <b>{t.org.name}</b>
                  <span className="small muted">{dayLabel(new Date(last.created_at))}</span>
                </span>
                <span className={`${s.preview} ${t.unread ? s.unread : ''}`}>
                  {last.direction === 'in' ? 'You: ' : ''}
                  {last.body}
                </span>
                {t.unread > 0 && <span className={s.badge}>{t.unread}</span>}
              </Link>
            );
          })}
          <p className={s.listLabel}>Event group chats</p>
          {vol.is_minor ? (
            <p className="small muted" style={{ padding: '4px 14px 12px' }}>{MINOR_CHAT_OFF}</p>
          ) : (
            chats.length === 0 && <p className="small muted" style={{ padding: '4px 14px 12px' }}>Check in at an event to join its group chat.</p>
          )}
          {chats.map((c) => (
            <Link key={c.event.id} href={`/me/messages?event=${c.event.id}`} className={s.row} aria-current={c.event.id === eventId ? 'page' : undefined}>
              <span className={s.rowTop}>
                <b>{c.event.title}</b>
                <span className="small muted">{fmtDay(c.event.starts_at)}</span>
              </span>
              <span className={`${s.preview} ${c.unread ? s.unread : ''}`}>{c.last ? `${c.last.author}: ${c.last.body}` : `${c.members} people · no posts yet`}</span>
              {c.unread > 0 && <span className={s.badge}>{c.unread}</span>}
            </Link>
          ))}
        </nav>

        <section className={`card ${s.convo}`} aria-label="Conversation">
          {thread ? (
            <OrgThread t={thread} />
          ) : canChat && chatSummary ? (
            <EventChat eventId={chatSummary.event.id} title={chatSummary.event.title} orgName={chatSummary.org.name} when={chatSummary.event.starts_at} me={vol.id} />
          ) : (
            <div className={s.emptyConvo}>
              <p className="muted">{orgId || eventId ? 'That conversation isn’t one of yours.' : 'Pick a conversation.'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function OrgThread({ t }: { t: VolThread }) {
  const lastUnread = t.messages.filter((m) => m.direction === 'out' && !m.read_at).at(-1)?.id ?? null;
  return (
    <>
      <header className={s.head}>
        <Link href="/me/messages" className={s.backLink}>
          ← All messages
        </Link>
        <h2 className={s.h2}>{t.org.name}</h2>
        <p className="small muted">
          {t.org.coordinator_name} at {t.org.name} · {t.org.contact_phone}
        </p>
      </header>
      <div className={s.stream} id="vol-stream">
        {t.messages.map((m, i) => {
          const day = dayLabel(new Date(m.created_at));
          const rule = i === 0 || day !== dayLabel(new Date(t.messages[i - 1]!.created_at)) ? <p className={s.dayRule}>{day}</p> : null;
          const label = SOURCE_LABEL[m.source];
          const mine = m.direction === 'in';
          return (
            <div key={m.id} className={s.msg}>
              {rule}
              <div className={`${s.bubble} ${mine ? s.mine : s.theirs}`}>
                {!mine && label && <span className={s.tag}>{label}</span>}
                {m.body}
              </div>
              {!mine && actionsFor(m.body).length > 0 && (
                <div className={s.actions}>
                  {actionsFor(m.body).map((a) => (
                    <Link key={a.href} href={a.href} className="btn btn-sm">
                      {a.label}
                    </Link>
                  ))}
                </div>
              )}
              <p className={`${s.stamp} ${mine ? s.stampMine : ''}`}>{fmtTime(m.created_at)}</p>
            </div>
          );
        })}
      </div>
      <LiveThread kind="org" id={t.org.id} lastUnreadId={lastUnread} />
      {t.can_reply ? (
        <Composer kind="org" id={t.org.id} placeholder={`Reply to ${t.org.coordinator_name}…`} />
      ) : (
        <p className={`notice small ${s.offNote}`}>
          {MINOR_MESSAGES_OFF} Announcements from {t.org.name} still show up here.
        </p>
      )}
    </>
  );
}

async function EventChat({ eventId, title, orgName, when, me }: { eventId: string; title: string; orgName: string; when: Date; me: string }) {
  const [messages, members] = await Promise.all([chatForVolunteer(eventId, me), chatMembers(eventId)]);
  const names = members.map((m) => (m.volunteer_id === me ? 'You' : shortName(m.name)));
  return (
    <>
      <header className={s.head}>
        <Link href="/me/messages" className={s.backLink}>
          ← All messages
        </Link>
        <h2 className={s.h2}>{title}</h2>
        <div className="row wrap small muted" style={{ gap: 8 }}>
          <span>
            {orgName} · {fmtDay(when)}
          </span>
          <details className={s.members}>
            <summary>{names.length} people</summary>
            <p>{names.join(', ')}</p>
          </details>
        </div>
      </header>
      <div className={s.stream} id="vol-stream">
        {messages.length === 0 && <p className="muted small">No posts yet. Say hi, or ask where to meet.</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const day = dayLabel(new Date(m.created_at));
          const newDay = !prev || day !== dayLabel(new Date(prev.created_at));
          const showAuthor = !m.mine && (newDay || m.author.name !== prev?.author.name);
          return (
            <div key={m.id} className={s.msg}>
              {newDay && <p className={s.dayRule}>{day}</p>}
              {showAuthor && <p className={s.author}>{m.author.name}</p>}
              <div className={`${s.bubble} ${m.mine ? s.mine : s.theirs} ${m.author.kind === 'org' ? s.coord : ''}`}>{m.body}</div>
              <p className={`${s.stamp} ${m.mine ? s.stampMine : ''}`}>{fmtTime(m.created_at)}</p>
            </div>
          );
        })}
      </div>
      <LiveThread kind="event" id={eventId} lastUnreadId={messages.at(-1)?.id ?? null} />
      <Composer kind="event" id={eventId} placeholder={`Message everyone at ${title}…`} />
    </>
  );
}

export const instant = false;
