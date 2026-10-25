import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { sql } from '@/lib/db';
import { loadOrgInsights } from '@/lib/insights';
import { audienceOptions, listBroadcasts, optedInIds, upcoming, type BroadcastStats } from '@/lib/messages';
import { draftEnabled } from '@/lib/messages-ai';
import { fmtDay, fmtTime, plural, requestNow } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Stagger } from '@/components/motion/Stagger';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/shell/icons';
import { ToastOnMount } from '@/components/shell/Toast';
import { Help } from '../Help';
import { BroadcastComposer } from './BroadcastComposer';
import s from '../messages.module.css';

export const metadata = {
  title: 'Broadcasts',
  description: 'Send one message to a group of volunteers and see what they did next. Announcements reach only volunteers who opted in.',
};

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);

function Funnel({ b }: { b: BroadcastStats }) {
  const rows = [
    { label: 'Sent', n: b.recipients },
    { label: 'Read', n: b.read },
    { label: 'Replied', n: b.replied },
    ...(b.showed_up != null ? [{ label: 'Showed up', n: b.showed_up, gold: true }] : []),
  ];
  return (
    <div className={s.funnel}>
      {rows.map((r) => (
        <div key={r.label} className={s.fRow}>
          <span className="label">{r.label}</span>
          <span className={s.fTrack}>
            <span className={`${s.fFill} ${'gold' in r ? s.fFillGold : ''}`} style={{ width: `${Math.max(pct(r.n, b.recipients), r.n ? 2 : 0)}%`, display: 'block' }} />
          </span>
          <span className="n">{r.n.toLocaleString()}</span>
          <span className="pct">{pct(r.n, b.recipients)}%</span>
        </div>
      ))}
    </div>
  );
}

// A broadcast's results as four compact funnel bars (Sent, Read, Replied,
// Showed up), each with its count and share of those sent.
function MiniFunnel({ b }: { b: BroadcastStats }) {
  const steps: [string, number | null, boolean?][] = [
    ['Sent', b.recipients],
    ['Read', b.read],
    ['Replied', b.replied],
    ['Showed up', b.showed_up, true],
  ];
  return (
    <dl className={s.miniFunnel}>
      {steps.map(([label, n, gold]) => (
        <div key={label} className={s.mini}>
          <dt className={s.miniLabel}>{label}</dt>
          <dd className={s.miniVal}>
            <span className="num">{n == null ? '—' : n.toLocaleString()}</span>
            {n != null && label !== 'Sent' && <span className={s.miniPct}>{pct(n, b.recipients)}%</span>}
          </dd>
          <span className={s.miniTrack} aria-hidden>
            <span className={`${s.miniFill} ${gold ? s.miniGold : ''}`} style={{ transform: `scaleX(${n == null ? 0 : Math.max(pct(n, b.recipients), n ? 3 : 0) / 100})` }} />
          </span>
        </div>
      ))}
    </dl>
  );
}

export default async function BroadcastsPage({ searchParams }: PageProps<'/org/messages/broadcasts'>) {
  const org = await requireOrg('/org/messages/broadcasts');
  const sp = await searchParams;
  const ins = await loadOrgInsights(org.id);
  const list = await listBroadcasts(org.id);
  const focusId = typeof sp.id === 'string' ? sp.id : typeof sp.sent === 'string' ? sp.sent : null;
  const focus = list.find((b) => b.id === focusId);
  const composing = sp.new === '1' || list.length === 0;
  const now = requestNow();
  const nextEvent = upcoming(ins, new Date(now))[0];
  const sampleVol = ins.volunteers.find((v) => v.volunteer_id && v.status === 'active') ?? ins.volunteers[0];
  // One real delivered copy, so the preview shows what a person actually read.
  const [delivered] = focus
    ? ((await sql`
        select m.body, v.name from message m join volunteer v on v.id = m.volunteer_id
        where m.broadcast_id = ${focus.id} order by v.name limit 1`) as unknown as { body: string; name: string }[])
    : [];

  // People with an account at each event: "everyone at <event>" audiences,
  // and how many of them opted in to announcements (the audience preview).
  const peopleRows = (await sql`
      select a.event_id, count(distinct a.volunteer_id)::int as n,
        count(distinct a.volunteer_id) filter (where v.marketing_opt_in)::int as opted
      from attendance a join event e on e.id = a.event_id join volunteer v on v.id = a.volunteer_id
      where e.org_id = ${org.id} and a.status <> 'no_show' group by a.event_id`) as unknown as { event_id: string; n: number; opted: number }[];
  const people = new Map(peopleRows.map((r) => [r.event_id, r]));
  const opted = await optedInIds(ins.volunteers.map((v) => v.volunteer_id).filter((x): x is string => !!x));
  const events = ins.events
    .filter((e) => !e.is_practice)
    .map((e) => ({
      id: e.id,
      title: e.title,
      when: fmtDay(e.starts_at),
      date: fmtDay(e.starts_at),
      time: fmtTime(e.starts_at),
      location: e.location ?? '',
      past: new Date(e.ends_at).getTime() < now, // ended; a live event can still be announced
      people: people.get(e.id)?.n ?? 0,
      optedIn: people.get(e.id)?.opted ?? 0,
    }));

  // "Send announcement" from an event page: that event's people, and if it's
  // still ahead, an invitation to it.
  const fromEvent = typeof sp.event === 'string' ? events.find((e) => e.id === sp.event) : undefined;
  const initialAudience = fromEvent ? (fromEvent.people > 0 ? `event:${fromEvent.id}` : 'regulars') : undefined;
  const initialEvent = fromEvent ? (fromEvent.past ? '' : fromEvent.id) : (nextEvent?.id ?? '');

  const totals = list.reduce((t, b) => ({ sent: t.sent + b.recipients, read: t.read + b.read, replied: t.replied + b.replied }), { sent: 0, read: 0, replied: 0 });

  return (
    <Stagger className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={`${plural(list.length, 'broadcast')} sent`}
        title={composing ? (fromEvent ? 'New announcement' : 'New broadcast') : 'Broadcasts'}
        lede={
          composing ? (
            fromEvent ? fromEvent.title : 'One message to a group, with results from what people did next.'
          ) : list.length > 0 ? (
            <span className={s.summary}>
              <span>
                <b className="num">{totals.sent.toLocaleString()}</b> messages sent
              </span>
              <span>
                <b className="num">{pct(totals.read, totals.sent)}%</b> read
              </span>
              <span>
                <b className="num">{pct(totals.replied, totals.sent)}%</b> replied
              </span>
            </span>
          ) : undefined
        }
        help={
          <Help label="How results are counted" placement="bottom-end">
            <p>
              <strong>Read</strong> means opened in the app. <strong>Replied</strong> counts anyone who wrote back within 7 days.
            </p>
            <p>
              <strong>Showed up</strong> counts people who checked in at the invited event with the QR code.
            </p>
          </Help>
        }
        action={
          composing ? (
            list.length > 0 && (
              <Link className="btn" href="/org/messages/broadcasts">
                Cancel
              </Link>
            )
          ) : (
            <Link className="btn btn-primary" href="/org/messages/broadcasts?new=1">
              <Icon name="plus" size={16} /> New broadcast
            </Link>
          )
        }
      />

      {sp.sent && focus && <ToastOnMount id={`sent-${focus.id}`} message={`Sent to ${plural(focus.recipients, 'volunteer')}`} body="Results fill in as they open it." />}

      {composing && (
        <section>
          <BroadcastComposer
            orgName={org.name}
            coordinator={org.coordinator_name}
            audiences={audienceOptions(ins, opted)}
            events={events}
            sample={{ first_name: sampleVol?.name.split(' ')[0] ?? 'Ana', hours: String(sampleVol?.hours ?? 12) }}
            canDraft={draftEnabled()}
            initialEvent={initialEvent}
            initialAudience={initialAudience}
            initialTitle={fromEvent ? `${fromEvent.title} announcement` : ''}
          />
        </section>
      )}

      {focus && !composing && (
        <section className={s.bGrid}>
          <div className="card card-pad stack" style={{ gap: 18 }}>
            <div className="row between wrap">
              <div>
                <div className="eyebrow eyebrow-sap">{focus.audience_label}</div>
                <h2 style={{ marginTop: 4 }}>{focus.title}</h2>
                <p className="small muted">
                  Sent {fmtDay(focus.sent_at)} at {fmtTime(focus.sent_at)} by {focus.sent_by}
                  {focus.event_title ? ` · invites to ${focus.event_title}, ${fmtDay(focus.event_starts_at!)}` : ''}
                </p>
              </div>
              <Chip tone="green" icon="check">
                Sent
              </Chip>
            </div>
            <Funnel b={focus} />
            <Link className="btn btn-sm" href="/org/messages?f=reply" style={{ justifySelf: 'start' }}>
              See replies in the inbox <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className={s.phone} aria-label="The message volunteers received">
            <div className={s.screen}>
              <div className={s.phoneHead}>
                <span className="avatar">{org.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{org.name}</div>
                  <div className="small muted" style={{ fontSize: 11 }}>
                    {org.coordinator_name} · in SycaMore
                  </div>
                </div>
              </div>
              <div className={s.phoneNote}>{fmtDay(focus.sent_at)}</div>
              <div className={s.phoneBubble}>{delivered?.body ?? focus.body}</div>
              <div className={s.phoneNote}>{delivered ? `As ${delivered.name.split(' ')[0]} received it. Everyone sees their own name.` : 'The template'}</div>
            </div>
          </div>
        </section>
      )}

      {list.length > 0 && !composing && (
        <section className="stack" style={{ gap: 12 }}>
          <h2 className={s.h2}>All broadcasts</h2>
          <ul className={`card ${s.bList}`}>
            {list.map((b) => (
              <li key={b.id}>
                <Link href={`/org/messages/broadcasts?id=${b.id}`} className={s.bRow} aria-current={focus?.id === b.id ? 'true' : undefined} scroll={false}>
                  <span className={s.bText}>
                    <strong>{b.title}</strong>
                    <span className={s.bMeta}>
                      {fmtDay(b.sent_at)} · {b.audience_label}
                      {b.event_title ? ` · ${b.event_title}` : ''} · by {b.sent_by.split(' ')[0]}
                    </span>
                  </span>
                  <MiniFunnel b={b} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Stagger>
  );
}

export const instant = false;
