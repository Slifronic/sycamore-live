import 'server-only';
import { sql } from './db';
import { loadOrgInsights, type OrgInsights } from './insights';
import { hoursTotal } from './hours';
import { fmtDay, fmtTime } from './format';
import type { AttendanceRow, EventRow, Org } from './types';

// Messages between a coordinator and the volunteers who have served with them.
// Everything stays inside SycaMore: no phone numbers, no SMS, no email sent on
// anyone's behalf. Volunteers read and reply on their own Messages screen.
//
// Three ways a message goes out, mirroring a customer-messaging inbox:
//   direct      the coordinator writes to one volunteer from the inbox
//   broadcast   one message to an audience, with a funnel (read, replied, showed up)
//   automation  a rule fires on attested data (forgot to check out, hours verified…)
// Every number a template fills in ({hours}, {event}, dates) comes from the
// database, never from the person writing it.

export const MAX_BODY = 1000;
export class MessageError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type MessageRow = {
  id: string;
  org_id: string;
  volunteer_id: string;
  direction: 'out' | 'in';
  body: string;
  source: 'direct' | 'broadcast' | 'automation';
  broadcast_id: string | null;
  automation_key: string | null;
  sent_by: string | null;
  created_at: Date;
  read_at: Date | null;
};

export type ThreadSummary = {
  volunteer_id: string;
  name: string;
  last_body: string;
  last_direction: 'out' | 'in';
  last_source: MessageRow['source'];
  last_at: Date;
  unread: number; // incoming the coordinator hasn't opened
  status: 'new' | 'active' | 'slipping' | null;
  hours: number;
};

// ---------- placeholders ----------

export const PLACEHOLDERS = ['{first_name}', '{org}', '{event}', '{date}', '{time}', '{location}', '{hours}', '{next_event}'] as const;

export type FillContext = {
  first_name: string;
  org: string;
  event?: string;
  date?: string;
  time?: string;
  location?: string;
  hours?: string;
  next_event?: string;
};

export function fill(template: string, ctx: FillContext): string {
  return template
    .replace(/\{(\w+)\}/g, (whole, key: string) => {
      const v = (ctx as Record<string, string | undefined>)[key];
      return v ?? whole;
    })
    .trim();
}

// A placeholder the context can't fill would reach a volunteer as "{event}".
export function unfilled(text: string): string[] {
  return [...new Set(text.match(/\{\w+\}/g) ?? [])];
}

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;

function eventCtx(e: Pick<EventRow, 'title' | 'starts_at' | 'location'> | null | undefined) {
  if (!e) return {};
  return { event: e.title, date: fmtDay(e.starts_at), time: fmtTime(e.starts_at), location: e.location ?? 'the usual spot' };
}

function nextLine(next: EventRow | undefined) {
  return next ? `${next.title} on ${fmtDay(next.starts_at)}${next.location ? ` at ${next.location}` : ''}` : undefined;
}

export function upcoming(ins: OrgInsights, now = new Date()) {
  return ins.events
    .filter((e) => !e.is_practice && new Date(e.starts_at).getTime() > now.getTime() && !e.attested_at)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
}

// ---------- inbox ----------

export async function listThreads(orgId: string, ins?: OrgInsights): Promise<ThreadSummary[]> {
  const rows = (await sql`
    select distinct on (m.volunteer_id)
      m.volunteer_id, v.name, m.body as last_body, m.direction as last_direction, m.source as last_source, m.created_at as last_at,
      (select count(*)::int from message u where u.org_id = m.org_id and u.volunteer_id = m.volunteer_id and u.direction = 'in' and u.read_at is null) as unread
    from message m join volunteer v on v.id = m.volunteer_id
    where m.org_id = ${orgId}
    order by m.volunteer_id, m.created_at desc
  `) as unknown as Omit<ThreadSummary, 'status' | 'hours'>[];
  const vols = new Map((ins ?? (await loadOrgInsights(orgId))).volunteers.filter((v) => v.volunteer_id).map((v) => [v.volunteer_id!, v]));
  return rows
    .map((r) => ({ ...r, status: vols.get(r.volunteer_id)?.status ?? null, hours: vols.get(r.volunteer_id)?.hours ?? 0 }))
    .sort((a, b) => +b.last_at - +a.last_at);
}

export async function unreadCount(orgId: string): Promise<number> {
  const [r] = await sql`select count(*)::int as n from message where org_id = ${orgId} and direction = 'in' and read_at is null`;
  return r?.n ?? 0;
}

export async function getThread(orgId: string, volunteerId: string): Promise<MessageRow[]> {
  return (await sql`
    select * from message where org_id = ${orgId} and volunteer_id = ${volunteerId} order by created_at
  `) as unknown as MessageRow[];
}

export async function markThreadRead(orgId: string, volunteerId: string) {
  await sql`update message set read_at = now() where org_id = ${orgId} and volunteer_id = ${volunteerId} and direction = 'in' and read_at is null`;
}

// Who a coordinator may write to: anyone who has served with the org, or who
// already has a thread with it. Never a stranger.
export async function canMessage(orgId: string, volunteerId: string): Promise<boolean> {
  const [r] = await sql`
    select exists (
      select 1 from attendance a join event e on e.id = a.event_id
      where e.org_id = ${orgId} and a.volunteer_id = ${volunteerId}
    ) or exists (select 1 from message where org_id = ${orgId} and volunteer_id = ${volunteerId}) as ok`;
  return !!r?.ok;
}

function cleanBody(body: string) {
  const text = body.replace(/\r\n/g, '\n').trim();
  if (!text) throw new MessageError('Write a message first.');
  if (text.length > MAX_BODY) throw new MessageError(`Keep it under ${MAX_BODY} characters.`);
  const left = unfilled(text);
  if (left.length) throw new MessageError(`${left.join(', ')} can’t be filled in here. Replace it with the words you mean.`);
  return text;
}

export async function sendDirect(org: Org, volunteerId: string, body: string) {
  const text = cleanBody(body);
  if (!(await canMessage(org.id, volunteerId))) throw new MessageError('You can only message volunteers who have served with you.');
  await sql`
    insert into message (org_id, volunteer_id, direction, body, source, sent_by)
    values (${org.id}, ${volunteerId}, 'out', ${text}, 'direct', ${org.coordinator_name})`;
  // Writing back answers everything they sent.
  await markThreadRead(org.id, volunteerId);
}

// ---------- broadcasts ----------

export type Audience = 'all' | 'regulars' | 'new' | 'slipping' | `event:${string}`;

export function audienceOptions(ins: OrgInsights) {
  const withAccount = ins.volunteers.filter((v) => v.volunteer_id);
  const base = [
    { key: 'all', label: 'Everyone with verified hours', count: withAccount.length },
    { key: 'regulars', label: 'Regulars (2+ events)', count: withAccount.filter((v) => v.status === 'active').length },
    { key: 'new', label: 'First-timers', count: withAccount.filter((v) => v.status === 'new').length },
    { key: 'slipping', label: 'Slipping away', count: withAccount.filter((v) => v.status === 'slipping').length },
  ];
  return base;
}

export async function resolveAudience(orgId: string, audience: string, ins: OrgInsights): Promise<{ label: string; people: { id: string; name: string; hours?: number }[] }> {
  const withAccount = ins.volunteers.filter((v) => v.volunteer_id);
  const pick = (f: (v: (typeof withAccount)[number]) => boolean, label: string) => ({
    label,
    people: withAccount.filter(f).map((v) => ({ id: v.volunteer_id!, name: v.name, hours: v.hours })),
  });
  if (audience === 'all') return pick(() => true, 'Everyone with verified hours');
  if (audience === 'regulars') return pick((v) => v.status === 'active', 'Regulars (2+ events)');
  if (audience === 'new') return pick((v) => v.status === 'new', 'First-timers');
  if (audience === 'slipping') return pick((v) => v.status === 'slipping', 'Slipping away');
  const m = /^event:([0-9a-f-]{36})$/.exec(audience);
  if (m) {
    const ev = ins.events.find((e) => e.id === m[1]);
    if (!ev) throw new MessageError('That event isn’t yours.');
    const rows = (await sql`
      select distinct on (a.volunteer_id) a.volunteer_id as id, v.name,
        coalesce(a.hours_adjusted, a.hours_captured)::float as hours
      from attendance a join volunteer v on v.id = a.volunteer_id
      where a.event_id = ${ev.id} and a.volunteer_id is not null and a.status <> 'no_show'
    `) as unknown as { id: string; name: string; hours: number }[];
    return { label: `Everyone at ${ev.title}`, people: rows };
  }
  throw new MessageError('Pick who it goes to.');
}

export async function sendBroadcast(
  org: Org,
  input: { title: string; body: string; audience: string; event_id: string | null },
): Promise<{ id: string; recipients: number }> {
  const ins = await loadOrgInsights(org.id);
  const template = input.body.replace(/\r\n/g, '\n').trim();
  if (!template) throw new MessageError('Write the message first.');
  if (template.length > MAX_BODY) throw new MessageError(`Keep it under ${MAX_BODY} characters.`);
  const title = input.title.trim() || template.slice(0, 48);
  const invite = input.event_id ? ins.events.find((e) => e.id === input.event_id) : undefined;
  if (input.event_id && !invite) throw new MessageError('That event isn’t yours.');
  const allowed = new Set(['{first_name}', '{org}', '{hours}', ...(invite ? ['{event}', '{date}', '{time}', '{location}'] : [])]);
  const bad = unfilled(template).filter((p) => !allowed.has(p));
  if (bad.length) throw new MessageError(`${bad.join(', ')} needs ${invite ? 'a value we don’t have' : 'an event: pick one under “Invites them to”'}.`);

  const { label, people } = await resolveAudience(org.id, input.audience, ins);
  if (people.length === 0) throw new MessageError('Nobody is in that group yet.');

  return sql.begin(async (tx) => {
    const [b] = await tx`
      insert into broadcast (org_id, title, body, audience, audience_label, event_id, recipients, sent_by)
      values (${org.id}, ${title}, ${template}, ${input.audience}, ${label}, ${invite?.id ?? null}, ${people.length}, ${org.coordinator_name})
      returning id`;
    for (const p of people) {
      const text = fill(template, { first_name: first(p.name), org: org.name, hours: p.hours != null ? String(p.hours) : undefined, ...eventCtx(invite) });
      await tx`
        insert into message (org_id, volunteer_id, direction, body, source, broadcast_id, sent_by)
        values (${org.id}, ${p.id}, 'out', ${text.slice(0, MAX_BODY)}, 'broadcast', ${b.id}, ${org.coordinator_name})`;
    }
    return { id: b.id as string, recipients: people.length };
  });
}

export type BroadcastStats = {
  id: string;
  title: string;
  body: string;
  audience_label: string;
  event_id: string | null;
  event_title: string | null;
  event_starts_at: Date | null;
  sent_by: string;
  sent_at: Date;
  recipients: number;
  read: number;
  replied: number;
  showed_up: number | null; // null when it invites to no event
};

// The funnel is counted from what happened, not estimated: read = opened in the
// app, replied = wrote back within 7 days, showed up = checked in at the event.
export async function listBroadcasts(orgId: string): Promise<BroadcastStats[]> {
  return (await sql`
    select b.id, b.title, b.body, b.audience_label, b.event_id, e.title as event_title, e.starts_at as event_starts_at,
      b.sent_by, b.sent_at, b.recipients,
      (select count(*)::int from message m where m.broadcast_id = b.id and m.read_at is not null) as read,
      (select count(distinct r.volunteer_id)::int from message m join message r
         on r.org_id = m.org_id and r.volunteer_id = m.volunteer_id and r.direction = 'in'
        and r.created_at > b.sent_at and r.created_at < b.sent_at + interval '7 days'
        where m.broadcast_id = b.id) as replied,
      case when b.event_id is null then null else
        (select count(distinct a.volunteer_id)::int from message m join attendance a
           on a.volunteer_id = m.volunteer_id and a.event_id = b.event_id and a.checked_in_at is not null
          where m.broadcast_id = b.id) end as showed_up
    from broadcast b left join event e on e.id = b.event_id
    where b.org_id = ${orgId}
    order by b.sent_at desc
  `) as unknown as BroadcastStats[];
}

// ---------- automations ----------

export type AutomationKey = 'missing_checkout' | 'record_ready' | 'event_reminder' | 'invite_back' | 'milestone';

export type AutomationDef = {
  key: AutomationKey;
  name: string;
  trigger: string;
  wait: string;
  condition: string; // what happens after, in plain words
  defaultBody: string;
  allowed: string[]; // placeholders this rule can fill
};

export const AUTOMATIONS: AutomationDef[] = [
  {
    key: 'missing_checkout',
    name: 'Forgot to check out',
    trigger: 'An event has ended and a volunteer is still checked in',
    wait: '30 minutes after the event’s end time',
    condition: 'If they check out, their hours are captured. If not, they show up as “missing check-out” on Verify.',
    defaultBody: 'Hi {first_name}, {event} ended at {time}. You’re still checked in: open SycaMore and tap Check out so your hours count. If you left earlier, reply with the time and {org} will fix it.',
    allowed: ['{first_name}', '{org}', '{event}', '{time}', '{date}', '{location}'],
  },
  {
    key: 'record_ready',
    name: 'Hours verified',
    trigger: 'The coordinator verifies an event the volunteer attended',
    wait: 'Right away (events verified in the last 3 weeks)',
    condition: 'If they open My hours, they can share the record with their school.',
    defaultBody: 'Hi {first_name}, {org} verified your {hours} hours at {event} on {date}. Your record is ready in My hours, and you can share it with your school from there.',
    allowed: ['{first_name}', '{org}', '{event}', '{date}', '{hours}', '{location}'],
  },
  {
    key: 'event_reminder',
    name: 'Day-before reminder',
    trigger: 'An event starts within the next 36 hours',
    wait: 'Sends to regulars (2+ events) once per event',
    condition: 'If they check in, it counts as “showed up”. No reply needed.',
    defaultBody: 'Hi {first_name}, {event} is {date} at {time}, {location}. Scan the QR code at the sign-in table to check in. Hope to see you there!',
    allowed: ['{first_name}', '{org}', '{event}', '{date}', '{time}', '{location}'],
  },
  {
    key: 'invite_back',
    name: 'Invite back',
    trigger: 'A volunteer came 2+ times but not in 30 days',
    wait: 'At most once a month per person, only when an event is coming up',
    condition: 'If they check in at the next event, they’re a regular again.',
    defaultBody: 'Hi {first_name}, we miss you at {org}! Our next event is {next_event}. Want to come?',
    allowed: ['{first_name}', '{org}', '{next_event}'],
  },
  {
    key: 'milestone',
    name: 'Hour milestone',
    trigger: 'A volunteer passes 10, 25, 50, 100 or 250 verified hours',
    wait: 'Once per milestone (crossed in the last 30 days)',
    condition: 'None. It’s a thank-you.',
    defaultBody: 'Hi {first_name}, you just passed {hours} verified hours with {org}. Thank you! Every one of them is on your record.',
    allowed: ['{first_name}', '{org}', '{hours}'],
  },
];

export const automationByKey = Object.fromEntries(AUTOMATIONS.map((a) => [a.key, a])) as Record<AutomationKey, AutomationDef>;

export type AutomationState = AutomationDef & { enabled: boolean; body: string; last_run_at: Date | null; sent: number; due: number };

type Pending = { volunteer_id: string; dedupe: string; ctx: FillContext };

// Everyone a rule would message right now, minus anyone it already messaged.
async function dueFor(org: Org, key: AutomationKey, ins: OrgInsights, now = new Date()): Promise<Pending[]> {
  const out: Pending[] = [];
  if (key === 'missing_checkout') {
    const rows = (await sql`
      select a.id, a.volunteer_id, v.name, e.title, e.ends_at, e.starts_at, e.location from attendance a
      join event e on e.id = a.event_id join volunteer v on v.id = a.volunteer_id
      where e.org_id = ${org.id} and e.is_practice = false and a.status = 'checked_in' and a.checked_out_at is null
        and e.attested_at is null and e.ends_at < ${new Date(now.getTime() - 30 * 60_000)}
    `) as unknown as { id: string; volunteer_id: string; name: string; title: string; ends_at: Date; starts_at: Date; location: string | null }[];
    for (const r of rows)
      out.push({ volunteer_id: r.volunteer_id, dedupe: `missing_checkout:${r.id}`, ctx: { first_name: first(r.name), org: org.name, event: r.title, time: fmtTime(r.ends_at), date: fmtDay(r.starts_at), location: r.location ?? '' } });
  }
  if (key === 'record_ready') {
    const rows = (await sql`
      select a.*, v.name, e.title, e.starts_at, e.location from attendance a
      join event e on e.id = a.event_id join volunteer v on v.id = a.volunteer_id
      where e.org_id = ${org.id} and e.is_practice = false and a.status = 'attested'
        and a.attested_at > ${new Date(now.getTime() - 21 * 86_400_000)}
    `) as unknown as (AttendanceRow & { name: string; title: string; starts_at: Date; location: string | null })[];
    for (const r of rows)
      out.push({ volunteer_id: r.volunteer_id!, dedupe: `record_ready:${r.id}`, ctx: { first_name: first(r.name), org: org.name, event: r.title, date: fmtDay(r.starts_at), hours: String(hoursTotal(r)), location: r.location ?? '' } });
  }
  if (key === 'event_reminder') {
    const soon = upcoming(ins, now).filter((e) => new Date(e.starts_at).getTime() - now.getTime() < 36 * 3_600_000);
    const regulars = ins.volunteers.filter((v) => v.volunteer_id && v.status === 'active');
    for (const e of soon) for (const v of regulars) out.push({ volunteer_id: v.volunteer_id!, dedupe: `event_reminder:${e.id}:${v.volunteer_id}`, ctx: { first_name: first(v.name), org: org.name, ...eventCtx(e) } });
  }
  if (key === 'invite_back') {
    const next = upcoming(ins, now)[0];
    if (next) {
      const month = now.toISOString().slice(0, 7);
      for (const v of ins.slipping.filter((v) => v.volunteer_id))
        out.push({ volunteer_id: v.volunteer_id!, dedupe: `invite_back:${v.volunteer_id}:${month}`, ctx: { first_name: first(v.name), org: org.name, next_event: nextLine(next) } });
    }
  }
  if (key === 'milestone') {
    for (const v of ins.milestones.filter((v) => v.volunteer_id))
      out.push({ volunteer_id: v.volunteer_id!, dedupe: `milestone:${v.volunteer_id}:${v.milestone!.hours}`, ctx: { first_name: first(v.name), org: org.name, hours: String(v.milestone!.hours) } });
  }
  if (out.length === 0) return out;
  const sent = new Set(
    ((await sql`select dedupe_key from message where org_id = ${org.id} and dedupe_key = any(${out.map((p) => p.dedupe)})`) as unknown as { dedupe_key: string }[]).map((r) => r.dedupe_key),
  );
  return out.filter((p) => !sent.has(p.dedupe));
}

export async function listAutomations(org: Org, ins?: OrgInsights): Promise<AutomationState[]> {
  const insights = ins ?? (await loadOrgInsights(org.id));
  const saved = new Map(
    ((await sql`select key, enabled, body, last_run_at from automation_rule where org_id = ${org.id}`) as unknown as { key: string; enabled: boolean; body: string; last_run_at: Date | null }[]).map((r) => [r.key, r]),
  );
  const sentBy = new Map(
    ((await sql`select automation_key, count(*)::int as n from message where org_id = ${org.id} and source = 'automation' group by automation_key`) as unknown as { automation_key: string; n: number }[]).map((r) => [r.automation_key, r.n]),
  );
  return Promise.all(
    AUTOMATIONS.map(async (a) => {
      const s = saved.get(a.key);
      return { ...a, enabled: s?.enabled ?? false, body: s?.body ?? a.defaultBody, last_run_at: s?.last_run_at ?? null, sent: sentBy.get(a.key) ?? 0, due: (await dueFor(org, a.key, insights)).length };
    }),
  );
}

export async function saveAutomation(org: Org, key: AutomationKey, enabled: boolean, body: string) {
  const def = automationByKey[key];
  if (!def) throw new MessageError('Unknown automation.');
  const text = body.replace(/\r\n/g, '\n').trim();
  if (!text) throw new MessageError('The message can’t be empty.');
  if (text.length > MAX_BODY) throw new MessageError(`Keep it under ${MAX_BODY} characters.`);
  const bad = unfilled(text).filter((p) => !def.allowed.includes(p));
  if (bad.length) throw new MessageError(`This rule can’t fill ${bad.join(', ')}. It can use ${def.allowed.join(' ')}.`);
  await sql`
    insert into automation_rule (org_id, key, enabled, body) values (${org.id}, ${key}, ${enabled}, ${text})
    on conflict (org_id, key) do update set enabled = excluded.enabled, body = excluded.body`;
}

// Runs every enabled rule once. In production this is a 15-minute cron; for the
// demo the coordinator presses "Run now". Safe to repeat: dedupe keys stop doubles.
export async function runAutomations(org: Org, only?: AutomationKey): Promise<Record<string, number>> {
  const ins = await loadOrgInsights(org.id);
  const states = await listAutomations(org, ins);
  const result: Record<string, number> = {};
  for (const a of states) {
    if (only ? a.key !== only : !a.enabled) continue;
    const due = await dueFor(org, a.key, ins);
    let n = 0;
    for (const p of due) {
      const text = fill(a.body, p.ctx).slice(0, MAX_BODY);
      const res = await sql`
        insert into message (org_id, volunteer_id, direction, body, source, automation_key, dedupe_key, sent_by)
        values (${org.id}, ${p.volunteer_id}, 'out', ${text}, 'automation', ${a.key}, ${p.dedupe}, ${org.coordinator_name})
        on conflict (org_id, dedupe_key) do nothing`;
      n += res.count;
    }
    await sql`
      insert into automation_rule (org_id, key, enabled, body, last_run_at) values (${org.id}, ${a.key}, ${a.enabled}, ${a.body}, now())
      on conflict (org_id, key) do update set last_run_at = now()`;
    result[a.key] = n;
  }
  return result;
}

// ---------- volunteer side (reference for /api/vol/messages) ----------

export type VolThread = {
  org: { id: string; name: string; coordinator_name: string; contact_phone: string };
  unread: number;
  messages: { id: string; direction: 'out' | 'in'; body: string; source: MessageRow['source']; created_at: Date; read_at: Date | null }[];
};

export async function volunteerThreads(volunteerId: string): Promise<VolThread[]> {
  const rows = (await sql`
    select m.id, m.org_id, m.direction, m.body, m.source, m.created_at, m.read_at,
      o.name, o.coordinator_name, o.contact_phone
    from message m join org o on o.id = m.org_id
    where m.volunteer_id = ${volunteerId}
    order by m.created_at
  `) as unknown as (VolThread['messages'][number] & { org_id: string; name: string; coordinator_name: string; contact_phone: string })[];
  const byOrg = new Map<string, VolThread>();
  for (const r of rows) {
    const t = byOrg.get(r.org_id) ?? { org: { id: r.org_id, name: r.name, coordinator_name: r.coordinator_name, contact_phone: r.contact_phone }, unread: 0, messages: [] };
    t.messages.push({ id: r.id, direction: r.direction, body: r.body, source: r.source, created_at: r.created_at, read_at: r.read_at });
    if (r.direction === 'out' && !r.read_at) t.unread++;
    byOrg.set(r.org_id, t);
  }
  return [...byOrg.values()].sort((a, b) => +b.messages.at(-1)!.created_at - +a.messages.at(-1)!.created_at);
}

export async function volunteerMarkRead(volunteerId: string, orgId: string) {
  await sql`update message set read_at = now() where org_id = ${orgId} and volunteer_id = ${volunteerId} and direction = 'out' and read_at is null`;
}

export async function volunteerReply(volunteerId: string, orgId: string, body: string) {
  const text = body.replace(/\r\n/g, '\n').trim();
  if (!text) throw new MessageError('Write a reply first.');
  if (text.length > MAX_BODY) throw new MessageError(`Keep it under ${MAX_BODY} characters.`);
  // Volunteers can only write to an organization that has messaged them or that they've served with.
  if (!(await canMessage(orgId, volunteerId))) throw new MessageError('You can only message organizations you’ve volunteered with.', 403);
  const [m] = await sql`
    insert into message (org_id, volunteer_id, direction, body, source)
    values (${orgId}, ${volunteerId}, 'in', ${text}, 'direct') returning id, created_at`;
  await volunteerMarkRead(volunteerId, orgId);
  return m as { id: string; created_at: Date };
}
