import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { loadOrgInsights } from '@/lib/insights';
import { automationByKey, canMessage, getThread, listThreads, type AutomationKey } from '@/lib/messages';
import { isUuid } from '@/lib/ids';
import { ago, fmtDay, fmtTime, initials, lastCame, plural, requestNow } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { orgChatUnread } from '@/lib/event-chat';
import { MINOR_MESSAGES_OFF, minorIds } from '@/lib/minors';
import { MessagesTabs } from './MessagesTabs';
import { Composer } from './Composer';
import { LiveInbox } from './LiveInbox';
import s from './messages.module.css';
import { EmptyState } from '@/components/media/EmptyState';

export const metadata = { title: 'Messages' };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'reply', label: 'Needs reply' },
  { key: 'away', label: 'Haven’t come in 30+ days' },
] as const;
type Filter = (typeof FILTERS)[number]['key'];

// Calendar days in Pacific time, not 24-hour spans: 8 PM yesterday is "Yesterday".
function dayLabel(d: Date, now: number) {
  const day = fmtDay(d);
  if (day === fmtDay(new Date(now))) return 'Today';
  if (day === fmtDay(new Date(now - 86_400_000))) return 'Yesterday';
  return day;
}

const STATUS_CHIP = { new: ['chip-ink', 'first-timer'], active: ['chip-green', 'regular'] } as const;

export default async function InboxPage({ searchParams }: PageProps<'/org/messages'>) {
  const org = await requireOrg();
  const sp = await searchParams;
  const f = (FILTERS.some((x) => x.key === sp.f) ? sp.f : 'all') as Filter;
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  // Only someone this org may write to opens; any other id behaves as not found.
  const openId = isUuid(sp.v) && (await canMessage(org.id, sp.v)) ? sp.v : null;

  const now = requestNow();
  const ins = await loadOrgInsights(org.id);
  const threads = await listThreads(org.id, ins);
  const unreadTotal = threads.reduce((n, t) => n + t.unread, 0);
  const counts: Record<Filter, number> = {
    all: threads.length,
    unread: threads.filter((t) => t.unread > 0).length,
    reply: threads.filter((t) => t.last_direction === 'in').length,
    away: threads.filter((t) => t.status === 'away').length,
  };
  const shown = threads.filter(
    (t) =>
      (f === 'all' || (f === 'unread' && t.unread > 0) || (f === 'reply' && t.last_direction === 'in') || (f === 'away' && t.status === 'away')) &&
      (!q || t.name.toLowerCase().includes(q) || t.last_body.toLowerCase().includes(q)),
  );

  // The open conversation (may be a brand-new one started from "New message").
  const vol = openId ? ins.volunteers.find((v) => v.volunteer_id === openId) : undefined;
  const [named] = openId ? ((await sql`select id, name from volunteer where id = ${openId}`) as unknown as { id: string; name: string }[]) : [];
  const messages = openId && named ? await getThread(org.id, openId) : [];
  const unreadInOpen = messages.filter((m) => m.direction === 'in' && !m.read_at).length;
  const firstUnread = messages.find((m) => m.direction === 'in' && !m.read_at)?.id;
  const broadcastTitles = new Map(
    ((await sql`select id, title from broadcast where org_id = ${org.id}`) as unknown as { id: string; title: string }[]).map((b) => [b.id, b.title]),
  );
  // Volunteers under 18 get announcements only (lib/minors.ts), so they can't be picked for a direct message.
  const minors = await minorIds([...ins.volunteers.map((v) => v.volunteer_id).filter((x): x is string => !!x), ...(openId ? [openId] : [])]);
  const openIsMinor = !!openId && minors.has(openId);
  const startable = ins.volunteers
    .filter((v) => v.volunteer_id && !minors.has(v.volunteer_id) && !threads.some((t) => t.volunteer_id === v.volunteer_id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { f: f === 'all' ? null : f, q: q || null, v: openId, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const str = p.toString();
    return `/org/messages${str ? `?${str}` : ''}`;
  };

  return (
    <div className="page" style={{ gap: 18 }}>
      <PageHeader
        eyebrow={`People · ${plural(threads.length, 'conversation')}${unreadTotal ? ` · ${unreadTotal} unread` : ''}`}
        title="Messages"
        lede="Write to your volunteers inside SycaMore. They read and reply on their phones; nobody shares a phone number."
        action={<MessagesTabs on="inbox" unread={unreadTotal} chatUnread={await orgChatUnread(org.id)} />}
      />

      <div className={`card ${s.inbox} ${openId ? s.hasThread : ''}`}>
        <div className={s.listCol}>
          <div className={s.listHead}>
            <form role="search" className="row" style={{ gap: 8 }}>
              {f !== 'all' && <input type="hidden" name="f" value={f} />}
              <input className="input" style={{ height: 38, flex: 1 }} name="q" defaultValue={q} placeholder="Search name or message" aria-label="Search name or message" />
            </form>
            <form className="row" style={{ gap: 8 }} action="/org/messages">
              <select className="select" name="v" aria-label="Start a conversation with" style={{ height: 36, flex: 1, fontSize: 13 }} defaultValue="">
                <option value="" disabled>
                  New message to…
                </option>
                {startable.map((v) => (
                  <option key={v.volunteer_id} value={v.volunteer_id!}>
                    {v.name} · {v.hours} hrs
                  </option>
                ))}
              </select>
              <button className="btn btn-sm">Open</button>
            </form>
          </div>
          <nav className={s.filters} aria-label="Filter conversations">
            {FILTERS.map((x) => (
              <Link key={x.key} href={qs({ f: x.key === 'all' ? null : x.key, v: null })} className={s.filter} aria-current={f === x.key ? 'page' : undefined}>
                {x.label} <b>{counts[x.key]}</b>
              </Link>
            ))}
          </nav>
          <ul className={s.threads}>
            {shown.map((t) => (
              <li key={t.volunteer_id}>
                <Link href={qs({ v: t.volunteer_id })} className={s.thread} aria-current={openId === t.volunteer_id ? 'page' : undefined} scroll={false}>
                  <span className="avatar">{initials(t.name)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className={s.tName}>
                      <span>{t.name}</span>
                      {t.is_minor && (
                        <span className="chip chip-ink" style={{ height: 18, fontSize: 10.5, padding: '0 7px' }}>
                          under 18
                        </span>
                      )}
                    </span>
                    <span className={`${s.tPreview} ${t.unread ? s.unreadText : ''}`} style={{ display: 'block' }}>
                      {t.last_direction === 'out' ? 'You: ' : ''}
                      {t.last_body}
                    </span>
                    <span className={s.channel}>
                      <span className={`${s.dot} ${t.last_source === 'automation' ? s.dotAuto : t.last_source === 'broadcast' ? s.dotBroadcast : ''}`} aria-hidden />
                      {t.last_source === 'automation' ? 'Automation' : t.last_source === 'broadcast' ? 'Broadcast' : 'In app'}
                      {t.status === 'away' && t.last_seen ? (
                        <span className="chip chip-ink" style={{ height: 18, fontSize: 10.5, padding: '0 7px' }}>{lastCame(t.last_seen, new Date(now))}</span>
                      ) : t.status && t.status !== 'away' ? (
                        <span className={`chip ${STATUS_CHIP[t.status][0]}`} style={{ height: 18, fontSize: 10.5, padding: '0 7px' }}>{STATUS_CHIP[t.status][1]}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className={s.tMeta}>
                    {dayLabel(t.last_at, now) === 'Today' ? fmtTime(t.last_at) : dayLabel(t.last_at, now) === 'Yesterday' ? 'yesterday' : ago(t.last_at)}
                    {t.unread > 0 && (
                      <span className={s.badge}>
                        {t.unread}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
            {shown.length === 0 && <li className="small muted" style={{ padding: 16 }}>{threads.length === 0 ? 'No conversations yet. Start one above, or send a broadcast.' : 'Nothing matches.'}</li>}
          </ul>
        </div>

        <section className={s.convo} aria-label="Conversation">
          {openId && named ? (
            <>
              <div className={s.convoHead}>
                <div className={s.convoWho}>
                  <Link href={qs({ v: null })} className="btn btn-quiet btn-sm" aria-label="Back to all conversations" style={{ paddingInline: 8 }}>
                    ←
                  </Link>
                  <span className="avatar">{initials(named.name)}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong>{named.name}</strong>
                    <div className={s.facts}>
                      {vol ? (
                        <>
                          <span>
                            <b>{vol.hours}</b> verified hrs
                          </span>
                          <span>
                            <b>{vol.events}</b> {vol.events === 1 ? 'event' : 'events'}
                          </span>
                          <span className={s.hideNarrow}>{ROLE_LABEL[vol.topRole]}</span>
                          <span className={s.hideNarrow}>{lastCame(vol.last_seen, new Date(now))}</span>
                        </>
                      ) : (
                        <span>No verified hours yet</span>
                      )}
                    </div>
                  </div>
                </div>
                <Link className={`btn btn-sm btn-quiet ${s.hideNarrow}`} href={`/org/volunteers/${openId}/letter`}>
                  Hour letter
                </Link>
              </div>
              <div className={s.stream} id="stream" aria-live="polite">
                {messages.length === 0 && (
                  <div className={s.empty}>
                    <EmptyState compact illo="envelope" title={openIsMinor ? `No announcements to ${named.name.split(' ')[0]} yet.` : `No messages with ${named.name.split(' ')[0]} yet.`}>
                      {openIsMinor ? 'Broadcasts and automatic notices reach them here.' : 'Say hello below.'}
                    </EmptyState>
                  </div>
                )}
                {messages.map((m, i) => {
                  const day = fmtDay(m.created_at);
                  const newDay = i === 0 || fmtDay(messages[i - 1].created_at) !== day;
                  const tag =
                    m.source === 'automation' && m.automation_key
                      ? `Automation · ${automationByKey[m.automation_key as AutomationKey]?.name ?? ''}`
                      : m.source === 'broadcast' && m.broadcast_id
                        ? `Broadcast · ${broadcastTitles.get(m.broadcast_id) ?? ''}`
                        : null;
                  return (
                    <div key={m.id} style={{ display: 'contents' }}>
                      {newDay && <div className={s.dayRule}>{dayLabel(m.created_at, now)}</div>}
                      {m.id === firstUnread && <div className={s.newRule}>{unreadInOpen} new</div>}
                      <div className={`${s.bubble} ${m.direction === 'in' ? s.in : `${s.out} ${m.source === 'automation' ? s.outAuto : m.source === 'broadcast' ? s.outBroadcast : ''}`}`}>
                        {tag && <div className={s.tag}>{tag}</div>}
                        {m.body}
                      </div>
                      <div className={`${s.stamp} ${m.direction === 'out' ? s.stampOut : ''}`}>
                        {fmtTime(m.created_at)}
                        {m.direction === 'out' && (m.read_at ? ` · Read ${fmtTime(m.read_at)}` : ' · Delivered')}
                        {m.direction === 'out' && m.sent_by && m.source === 'direct' ? ` · ${m.sent_by.split(' ')[0]}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              {openIsMinor ? (
                <p className={`notice small ${s.offNote}`}>
                  {MINOR_MESSAGES_OFF} {named.name.split(' ')[0]} still gets your announcements.{' '}
                  <Link href="/org/messages/broadcasts?new=1">Send an announcement</Link>
                </p>
              ) : (
                <Composer key={openId} volunteerId={openId} firstName={named.name.split(' ')[0]} />
              )}
            </>
          ) : (
            <div className={s.empty} style={{ gridRow: '1 / -1' }}>
              <EmptyState compact illo="envelope" title="Pick a conversation">
                Replies from volunteers land here. Threads that need an answer are under “Needs reply”.
              </EmptyState>
            </div>
          )}
        </section>
      </div>
      <LiveInbox openId={openId} lastUnreadId={messages.findLast((m) => m.direction === 'in' && !m.read_at)?.id ?? null} streamId="stream" />
    </div>
  );
}

export const instant = false;
