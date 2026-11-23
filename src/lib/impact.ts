import 'server-only';
import { headers } from 'next/headers';
import { sql } from './db';
import { sha256 } from './auth-tokens';
import { currentVia } from './via';
import { clientIp } from './rate-limit';
import { computeSkills, SKILL_AREAS, type Attended } from './milestones';
import { isSlug } from './opportunity-rules';
import { isApplicationStatus, isBot, type ApplicationStatus } from './impact-rules';
import { VolError } from './vol-data';
import type { Activity, Role } from './types';

export * from './impact-rules';
export { currentVia, rememberVia } from './via';

// Impact tracking: who uses SycaMore and what they build with it, counted
// without following anyone around.
//   - Visits: a beacon from each page (UsageBeacon) adds one to the day's count
//     for that route and records a visitor as a hash of a daily random salt,
//     the address and the browser string. Raw addresses are never stored and
//     old salts are deleted, so visitors can't be linked across days.
//   - via: ?via=<tag> on a shared link sets a first-party cookie for 30 days.
//     A sign-up or an "I applied" in that time carries the tag, so the team
//     can see which invitations worked. The tag names a link, not a person.
//   - "I applied": a signed-in volunteer marks a public listing. It is the
//     volunteer's own word, and every page that shows it says so.
// The team reads all of it on /impact (see impact-access.ts).

const PACIFIC = 'America/Los_Angeles';

// ---------- visits ----------

let saltCache: { day: string; salt: string } | null = null;

/** Today's salt (Pacific day), made on first use; yesterday's is kept so a visit just past midnight still matches, older ones go. */
async function todaysSalt(): Promise<{ day: string; salt: string }> {
  const [{ day }] = (await sql`select to_char((now() at time zone ${PACIFIC})::date, 'YYYY-MM-DD') as day`) as unknown as { day: string }[];
  if (saltCache?.day === day) return saltCache;
  await sql`insert into usage_salt (day, salt) values (${day}::date, encode(gen_random_bytes(16), 'hex')) on conflict (day) do nothing`;
  await sql`delete from usage_salt where day < ${day}::date - 1`;
  const [r] = (await sql`select salt from usage_salt where day = ${day}::date`) as unknown as { salt: string }[];
  saltCache = { day, salt: r!.salt };
  return saltCache;
}

/** Counts one page view under its route (already normalized by countedPath). Bots are skipped. */
export async function recordView(path: string, via: string | null) {
  const ua = (await headers()).get('user-agent');
  if (isBot(ua)) return;
  const { day, salt } = await todaysSalt();
  const visitor = sha256(`${salt}|${await clientIp()}|${ua}`).slice(0, 32);
  await sql`
    insert into usage_day (day, kind, key, hits) values (${day}::date, 'view', ${path}, 1)
    on conflict (day, kind, key) do update set hits = usage_day.hits + 1`;
  await sql`
    insert into usage_visitor (day, visitor, first_path, via) values (${day}::date, ${visitor}, ${path}, ${via})
    on conflict (day, visitor) do update set views = usage_visitor.views + 1, via = coalesce(usage_visitor.via, excluded.via)`;
}

/** The day's count of clicks out to a listing's own page (the all-time total stays on opportunity.outbound_clicks). */
export async function recordOutbound(slug: string) {
  if (!isSlug(slug)) return;
  await sql`
    insert into usage_day (day, kind, key, hits) values ((now() at time zone ${PACIFIC})::date, 'outbound', ${slug}, 1)
    on conflict (day, kind, key) do update set hits = usage_day.hits + 1`;
}

// ---------- "I applied" ----------

export type MyApplication = {
  id: string;
  slug: string;
  title: string;
  org_name: string;
  skills: string[];
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
};

const appSelect = (volunteerId: string) => sql`
  select a.id, o.slug, o.title, o.org_name, o.skills, a.status, a.applied_at, a.updated_at
  from opportunity_application a join opportunity o on o.id = a.opportunity_id
  where a.volunteer_id = ${volunteerId}`;

/** The volunteer's applications, newest first. Hidden listings stay: it's their history. */
export async function myApplications(volunteerId: string): Promise<MyApplication[]> {
  const rows = (await sql`${appSelect(volunteerId)} order by a.applied_at desc`) as unknown as (Omit<MyApplication, 'applied_at' | 'updated_at'> & { applied_at: Date; updated_at: Date })[];
  return rows.map((r) => ({ ...r, applied_at: new Date(r.applied_at).toISOString(), updated_at: new Date(r.updated_at).toISOString() }));
}

/** Their application to one listing, if any. */
export async function applicationFor(volunteerId: string, slug: string): Promise<MyApplication | null> {
  if (!isSlug(slug)) return null;
  return (await myApplications(volunteerId)).find((a) => a.slug === slug) ?? null;
}

/**
 * "I applied" on a listed listing. Applying again after withdrawing reopens
 * it; applying again otherwise changes nothing. The via tag is the browser's
 * current one, else the one they signed up through.
 */
export async function markApplied(volunteerId: string, slug: unknown): Promise<MyApplication> {
  if (!isSlug(slug)) throw new VolError('That listing isn’t on the board.', 404);
  const [o] = (await sql`select id from opportunity where slug = ${slug} and status = 'listed'`) as unknown as { id: string }[];
  if (!o) throw new VolError('That listing isn’t on the board.', 404);
  const via = await currentVia();
  await sql`
    insert into opportunity_application (opportunity_id, volunteer_id, via)
    values (${o.id}, ${volunteerId}, coalesce(${via}::text, (select signup_via from volunteer where id = ${volunteerId})))
    on conflict (opportunity_id, volunteer_id) do update set
      status = 'applied', applied_at = now(), updated_at = now()
    where opportunity_application.status = 'withdrawn'`;
  return (await applicationFor(volunteerId, slug))!;
}

/** Moves their own application along: accepted, finished, or withdrawn. */
export async function setApplicationStatus(volunteerId: string, id: unknown, status: unknown): Promise<MyApplication> {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new VolError('That application isn’t yours.', 404);
  if (!isApplicationStatus(status)) throw new VolError('Pick applied, accepted, finished or withdrew.', 400);
  const [r] = (await sql`
    update opportunity_application set status = ${status}, updated_at = now()
    where id = ${id} and volunteer_id = ${volunteerId}
    returning id`) as unknown as { id: string }[];
  if (!r) throw new VolError('That application isn’t yours.', 404);
  return (await myApplications(volunteerId)).find((a) => a.id === id)!;
}

// ---------- the team's report ----------

export type ImpactReport = {
  includeDemo: boolean;
  totals: {
    /** Visits: a person counts once a day (the hash changes daily, so days can't be joined up). */
    visits7: number;
    visits30: number;
    views30: number;
    volunteers: number;
    volunteers30: number;
    orgs: number;
    verifiedHours: number;
    verifiedPeople: number;
    verifiedEvents: number;
    applications: number;
    applicants: number;
    accepted: number;
    completed: number;
    outbound: number;
  };
  daily: { day: string; visitors: number; views: number; signups: number; applications: number }[];
  pages: { path: string; views: number; visitors: number }[];
  listings: { slug: string; title: string; org_name: string; skills: string[]; views: number; outbound: number; applied: number; accepted: number; completed: number }[];
  via: { via: string; visitors: number; signups: number; applications: number }[];
  verifiedSkills: { key: string; name: string; people: number; hours: number; events: number }[];
  applicationSkills: { skill: string; people: number; accepted: number }[];
  recent: { id: string; who: string; slug: string; title: string; org_name: string; skills: string[]; status: ApplicationStatus; applied_at: string; via: string | null }[];
  signupMethods: { method: string; n: number }[];
};

/** "Ana Reyes" → "Ana R." The team page never needs a full name. */
export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? 'Someone');
};

const n = (v: unknown) => Number(v ?? 0);

/**
 * Everything /impact shows. Seed and demo accounts (emails and organizations
 * on .test addresses) are left out unless includeDemo, so the numbers the
 * team quotes are real people.
 */
export async function impactReport({ includeDemo = false } = {}): Promise<ImpactReport> {
  const realVol = includeDemo ? sql`true` : sql`v.email !~* '\\.test$'`;
  const realOrg = includeDemo ? sql`true` : sql`o.contact_email !~* '\\.test$'`;
  const today = sql`(now() at time zone ${PACIFIC})::date`;

  const [counts, daily, pages, listings, via, attended, appSkills, recent, methods] = await Promise.all([
    sql`
      select
        (select count(*) from usage_visitor where day > ${today} - 7) as visits7,
        (select count(*) from usage_visitor where day > ${today} - 30) as visits30,
        (select coalesce(sum(hits), 0) from usage_day where kind = 'view' and day > ${today} - 30) as views30,
        (select count(*) from volunteer v where ${realVol}) as volunteers,
        (select count(*) from volunteer v where ${realVol} and v.created_at > now() - interval '30 days') as volunteers30,
        (select count(*) from org o where ${realOrg}) as orgs,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where ${realVol} and a.status <> 'withdrawn') as applications,
        (select count(distinct a.volunteer_id) from opportunity_application a join volunteer v on v.id = a.volunteer_id where ${realVol} and a.status <> 'withdrawn') as applicants,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where ${realVol} and a.status in ('accepted','completed')) as accepted,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where ${realVol} and a.status = 'completed') as completed,
        (select coalesce(sum(outbound_clicks), 0) from opportunity) as outbound`,
    sql`
      with days as (select generate_series(${today} - 29, ${today}, interval '1 day')::date as day)
      select to_char(d.day, 'YYYY-MM-DD') as day,
        (select count(*) from usage_visitor u where u.day = d.day) as visitors,
        (select coalesce(sum(hits), 0) from usage_day u where u.day = d.day and u.kind = 'view') as views,
        (select count(*) from volunteer v where ${realVol} and (v.created_at at time zone ${PACIFIC})::date = d.day) as signups,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where ${realVol} and (a.applied_at at time zone ${PACIFIC})::date = d.day) as applications
      from days d order by d.day`,
    sql`
      select u.key as path, sum(u.hits) as views,
             (select count(*) from usage_visitor x where x.first_path = u.key and x.day > ${today} - 30) as visitors
      from usage_day u where u.kind = 'view' and u.day > ${today} - 30
      group by u.key order by views desc limit 15`,
    sql`
      select o.slug, o.title, o.org_name, o.skills, o.outbound_clicks as outbound,
        coalesce((select sum(hits) from usage_day u where u.kind = 'view' and u.key = '/opportunities/' || o.slug), 0) as views,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where a.opportunity_id = o.id and ${realVol} and a.status <> 'withdrawn') as applied,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where a.opportunity_id = o.id and ${realVol} and a.status in ('accepted','completed')) as accepted,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where a.opportunity_id = o.id and ${realVol} and a.status = 'completed') as completed
      from opportunity o where o.status = 'listed'
      order by applied desc, outbound desc, views desc, lower(o.org_name)`,
    sql`
      with tags as (
        select via from usage_visitor where via is not null
        union select signup_via from volunteer where signup_via is not null
        union select via from opportunity_application where via is not null)
      select t.via,
        (select count(*) from usage_visitor u where u.via = t.via) as visitors,
        (select count(*) from volunteer v where v.signup_via = t.via and ${realVol}) as signups,
        (select count(*) from opportunity_application a join volunteer v on v.id = a.volunteer_id where a.via = t.via and ${realVol} and a.status <> 'withdrawn') as applications
      from tags t order by applications desc, signups desc, visitors desc, t.via`,
    sql`
      select a.volunteer_id, e.id as event_id, e.org_id, o.name as org_name, e.starts_at, a.role, e.activity,
             coalesce(a.hours_adjusted, a.hours_captured)::float as hours, coalesce(r.status = 'revoked', false) as revoked
      from attendance a join event e on e.id = a.event_id join org o on o.id = e.org_id
      join volunteer v on v.id = a.volunteer_id
      left join record r on r.attendance_id = a.id
      where a.status = 'attested' and not e.is_practice and ${realVol}`,
    sql`
      select s.skill, count(distinct a.volunteer_id) as people,
             count(distinct a.volunteer_id) filter (where a.status in ('accepted','completed')) as accepted
      from opportunity_application a join opportunity o on o.id = a.opportunity_id
      join volunteer v on v.id = a.volunteer_id
      cross join lateral unnest(o.skills) as s(skill)
      where ${realVol} and a.status <> 'withdrawn'
      group by s.skill order by people desc, accepted desc, s.skill`,
    sql`
      select a.id, v.name, o.slug, o.title, o.org_name, o.skills, a.status, a.applied_at, a.via
      from opportunity_application a join opportunity o on o.id = a.opportunity_id join volunteer v on v.id = a.volunteer_id
      where ${realVol}
      order by a.applied_at desc limit 500`,
    sql`select v.signup_method as method, count(*) as n from volunteer v where ${realVol} group by 1 order by 2 desc`,
  ]);

  // Verified skills: each volunteer's skill areas from their own attested rows
  // (the same arithmetic as their journey page), then people and hours per area.
  type Row = { volunteer_id: string; event_id: string; org_id: string; org_name: string; starts_at: Date; role: Role; activity: Activity; hours: number; revoked: boolean };
  const byVol = new Map<string, Attended[]>();
  const liveEvents = new Set<string>();
  for (const r of attended as unknown as Row[]) {
    if (!r.revoked) liveEvents.add(r.event_id);
    const list = byVol.get(r.volunteer_id) ?? [];
    list.push({ org_id: r.org_id, org_name: r.org_name, starts_at: r.starts_at, role: r.role, activity: r.activity, hours: n(r.hours), status: 'attested', is_practice: false, revoked: r.revoked });
    byVol.set(r.volunteer_id, list);
  }
  const area = new Map(SKILL_AREAS.map((d) => [d.key, { key: d.key, name: d.name, people: 0, hours: 0, events: 0 }]));
  let verifiedHours = 0;
  let verifiedPeople = 0;
  for (const rows of byVol.values()) {
    const live = rows.filter((r) => !r.revoked);
    if (live.length) verifiedPeople++;
    verifiedHours += live.reduce((t, r) => t + r.hours, 0);
    for (const line of computeSkills(rows)) {
      const a = area.get(line.key)!;
      a.people++;
      a.hours += line.hours;
      a.events += line.events;
    }
  }
  const round1 = (x: number) => Math.round(x * 10) / 10;

  const c = counts[0]!;
  return {
    includeDemo,
    totals: {
      visits7: n(c.visits7),
      visits30: n(c.visits30),
      views30: n(c.views30),
      volunteers: n(c.volunteers),
      volunteers30: n(c.volunteers30),
      orgs: n(c.orgs),
      verifiedHours: round1(verifiedHours),
      verifiedPeople,
      verifiedEvents: liveEvents.size,
      applications: n(c.applications),
      applicants: n(c.applicants),
      accepted: n(c.accepted),
      completed: n(c.completed),
      outbound: n(c.outbound),
    },
    daily: daily.map((d) => ({ day: d.day, visitors: n(d.visitors), views: n(d.views), signups: n(d.signups), applications: n(d.applications) })),
    pages: pages.map((p) => ({ path: p.path, views: n(p.views), visitors: n(p.visitors) })),
    listings: listings.map((l) => ({ slug: l.slug, title: l.title, org_name: l.org_name, skills: l.skills, views: n(l.views), outbound: n(l.outbound), applied: n(l.applied), accepted: n(l.accepted), completed: n(l.completed) })),
    via: via.map((v) => ({ via: v.via, visitors: n(v.visitors), signups: n(v.signups), applications: n(v.applications) })),
    verifiedSkills: [...area.values()].filter((a) => a.people > 0).map((a) => ({ ...a, hours: round1(a.hours) })).sort((a, b) => b.people - a.people || b.hours - a.hours),
    applicationSkills: appSkills.map((s) => ({ skill: s.skill, people: n(s.people), accepted: n(s.accepted) })),
    recent: recent.map((r) => ({
      id: r.id,
      who: shortName(r.name),
      slug: r.slug,
      title: r.title,
      org_name: r.org_name,
      skills: r.skills,
      status: r.status,
      applied_at: new Date(r.applied_at).toISOString(),
      via: r.via,
    })),
    signupMethods: methods.map((m) => ({ method: m.method, n: n(m.n) })),
  };
}
