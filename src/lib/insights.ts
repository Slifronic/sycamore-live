import 'server-only';
import { sql } from './db';
import { BADGES, addAttendance, emptyStats, type BadgeKey, type VolunteerStats } from './badges';
import { hoursTotal } from './hours';
import type { Activity, AttendanceRow, EventRow, Role } from './types';

// Everything the dashboard shows is computed here from attested data only.
// Nothing is typed in by hand, so every number on screen can be traced back
// to check-ins and a coordinator's sign-off.

const DAY = 86_400_000;
// Came 2+ times but not in this many days: shown as a plain fact ("Last came
// 34 days ago"), never as a label about the person.
export const AWAY_AFTER_DAYS = 30;
export const MILESTONES = [10, 25, 50, 100, 250];

export type Tier = 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Building';

export type IndexPart = { key: 'retention' | 'efficiency' | 'completion'; label: string; weight: number; score: number | null; detail: string; how: string };

export type IndexResult = {
  score: number | null;
  tier: Tier;
  provisional: boolean; // fewer than 3 verified events
  parts: IndexPart[];
};

export type VolunteerSummary = {
  key: string;
  volunteer_id: string | null;
  name: string;
  events: number;
  hours: number;
  first_seen: Date;
  last_seen: Date;
  standouts: number;
  topRole: Role;
  status: 'new' | 'active' | 'away';
  stats: VolunteerStats;
  badgesEarned: BadgeKey[];
  badgesReady: BadgeKey[];
  badgesClose: { key: BadgeKey; progress: number }[];
  milestone: { hours: number; at: Date } | null; // most recent hour milestone crossed in the last 30 days
};

type Att = AttendanceRow & { activity: Activity; starts_at: Date };

const ROLE_RANK: Role[] = ['general', 'team_lead', 'event_coordinator', 'program_manager'];

export function tierFor(score: number | null): Tier {
  if (score == null) return 'Building';
  if (score >= 90) return 'Platinum';
  if (score >= 75) return 'Gold';
  if (score >= 60) return 'Silver';
  if (score >= 45) return 'Bronze';
  return 'Building';
}

export async function loadOrgInsights(orgId: string, now = new Date()) {
  const events = (await sql`
    select * from event where org_id = ${orgId} order by starts_at desc
  `) as unknown as EventRow[];
  const atts = (await sql`
    select a.*, e.activity, e.starts_at from attendance a
    join event e on e.id = a.event_id
    where e.org_id = ${orgId} and e.is_practice = false
  `) as unknown as Att[];
  const awards = (await sql`
    select volunteer_id, badge, signed_at from badge_award where org_id = ${orgId}
  `) as unknown as { volunteer_id: string; badge: BadgeKey; signed_at: Date }[];

  const real = events.filter((e) => !e.is_practice);
  const verified = real.filter((e) => e.attested_at);
  const awaiting = real.filter((e) => !e.attested_at && new Date(e.ends_at) < now);
  const attested = atts.filter((a) => a.status === 'attested');

  // Per-volunteer rollup (paper walk-ins without an account group by name).
  const byVol = new Map<string, Att[]>();
  for (const a of attested) {
    const key = a.volunteer_id ?? `name:${a.display_name.trim().toLowerCase()}`;
    if (!byVol.has(key)) byVol.set(key, []);
    byVol.get(key)!.push(a);
  }
  const awardsByVol = new Map<string, BadgeKey[]>();
  for (const w of awards) awardsByVol.set(w.volunteer_id, [...(awardsByVol.get(w.volunteer_id) ?? []), w.badge]);

  const volunteers: VolunteerSummary[] = [...byVol.entries()].map(([key, list]) => {
    const stats: VolunteerStats = emptyStats();
    let hours = 0;
    let standouts = 0;
    let top: Role = 'general';
    for (const a of list) {
      const h = hoursTotal(a);
      hours += h;
      addAttendance(stats, { role: a.role, activity: a.activity, hours: h });
      if (a.standout) standouts += 1;
      if (ROLE_RANK.indexOf(a.role) > ROLE_RANK.indexOf(top)) top = a.role;
    }
    const times = list.map((a) => new Date(a.starts_at).getTime());
    const first = new Date(Math.min(...times));
    const last = new Date(Math.max(...times));
    const sinceLast = (now.getTime() - last.getTime()) / DAY;
    const status: VolunteerSummary['status'] =
      list.length >= 2 && sinceLast > AWAY_AFTER_DAYS ? 'away' : list.length === 1 ? 'new' : 'active';
    const earned = list[0].volunteer_id ? awardsByVol.get(list[0].volunteer_id) ?? [] : [];
    const ready: BadgeKey[] = [];
    const close: { key: BadgeKey; progress: number }[] = [];
    for (const b of BADGES) {
      if (earned.includes(b.key)) continue;
      const p = b.progress(stats);
      if (p >= 1 && list[0].volunteer_id) ready.push(b.key);
      else if (p >= 0.6) close.push({ key: b.key, progress: p });
    }
    // Hour milestones: walk events in date order and note the last threshold crossed.
    let running = 0;
    let milestone: VolunteerSummary['milestone'] = null;
    for (const a of [...list].sort((x, y) => +new Date(x.starts_at) - +new Date(y.starts_at))) {
      const before = running;
      running += hoursTotal(a);
      for (const m of MILESTONES) if (before < m && running >= m) milestone = { hours: m, at: new Date(a.starts_at) };
    }
    if (milestone && (now.getTime() - milestone.at.getTime()) / DAY > 30) milestone = null;

    return {
      milestone,
      key,
      volunteer_id: list[0].volunteer_id,
      name: list[0].display_name,
      events: list.length,
      hours,
      first_seen: first,
      last_seen: last,
      standouts,
      topRole: top,
      status,
      stats,
      badgesEarned: earned,
      badgesReady: ready,
      badgesClose: close,
    };
  });
  volunteers.sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

  // ── The SycaMore Index (weights from the pitch: .35 / .30 / .35) ──
  // Hidden from the product until the business model's Phase 4 trigger (30 orgs,
  // 200 events): no nav link, card, tier chip or seal shows it. /org/score still
  // renders it for anyone who types the URL. Screens show observed facts instead.
  // Retention: of volunteers whose first event was 14+ days ago, the share who came back.
  const eligible = volunteers.filter((v) => (now.getTime() - v.first_seen.getTime()) / DAY >= 14);
  const returned = eligible.filter((v) => v.events >= 2);
  const retention = eligible.length ? Math.round((100 * returned.length) / eligible.length) : null;

  // Coordinator efficiency: how fast events get verified after they end.
  // Measured by the app, never self-reported.
  const speedScore = (hrs: number) => (hrs <= 24 ? 100 : hrs <= 72 ? 75 : hrs <= 168 ? 45 : 15);
  const lags = [
    ...verified.map((e) => (new Date(e.attested_at!).getTime() - new Date(e.ends_at).getTime()) / 3_600_000),
    ...awaiting.map((e) => (now.getTime() - new Date(e.ends_at).getTime()) / 3_600_000),
  ];
  const efficiency = lags.length ? Math.round(lags.reduce((s, h) => s + speedScore(h), 0) / lags.length) : null;
  const within24 = lags.filter((h) => h <= 24).length;

  // Event completion: the coordinator's answer at close ("did the event achieve its goal?").
  const outcomes = verified.filter((e) => e.goal_outcome);
  const completion = outcomes.length
    ? Math.round(outcomes.reduce((s, e) => s + (e.goal_outcome === 'yes' ? 100 : e.goal_outcome === 'partly' ? 55 : 0), 0) / outcomes.length)
    : null;

  const parts: IndexPart[] = [
    {
      key: 'retention',
      label: 'Volunteer retention',
      weight: 0.35,
      score: retention,
      detail: eligible.length ? `${returned.length} of ${eligible.length} volunteers came back for a second event` : 'Needs volunteers whose first event was 2+ weeks ago',
      how: 'Invite first-timers back within two weeks. The “Haven’t come in 30+ days” list shows who to message.',
    },
    {
      key: 'efficiency',
      label: 'Coordinator efficiency',
      weight: 0.3,
      score: efficiency,
      detail: lags.length ? `${within24} of ${lags.length} events verified within 24 hours of ending` : 'Verify your first event to start this score',
      how: 'Verify each event the same day. It takes about two minutes.',
    },
    {
      key: 'completion',
      label: 'Event completion',
      weight: 0.35,
      score: completion,
      detail: outcomes.length
        ? `${outcomes.filter((e) => e.goal_outcome === 'yes').length} of ${outcomes.length} events met their goal (your answer at close)`
        : 'Answer “did it meet its goal?” when you verify an event',
      how: 'Set a concrete goal for each event, such as “plant 40 trees”, so the answer is easy.',
    },
  ];
  const known = parts.filter((p) => p.score != null);
  const score = known.length === 3 ? Math.round(parts.reduce((s, p) => s + p.weight * (p.score ?? 0), 0)) : null;
  const index: IndexResult = { score, tier: tierFor(score), provisional: verified.length < 3, parts };

  // One point per verified event, oldest first: feeds the sparklines and the hours chart.
  const series = [...verified]
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .map((e) => {
      const rows = attested.filter((a) => a.event_id === e.id);
      return { id: e.id, title: e.title, date: new Date(e.starts_at), people: rows.length, hours: rows.reduce((s, a) => s + hoursTotal(a), 0) };
    });

  // Observed, not scored: how many verified events were signed off within a
  // day of ending (the timestamps come from the app, never typed in).
  const verifiedWithin24h = verified.filter((e) => new Date(e.attested_at!).getTime() - new Date(e.ends_at).getTime() <= 24 * 3_600_000).length;

  const totals = {
    verifiedHours: attested.reduce((s, a) => s + hoursTotal(a), 0),
    attendances: attested.length,
    uniqueVolunteers: volunteers.length,
    verifiedEvents: verified.length,
    verifiedWithin24h,
    awaiting: awaiting.length,
    standouts: attested.filter((a) => a.standout).length,
  };

  return {
    events,
    realEvents: real,
    verified,
    awaiting,
    volunteers,
    away: volunteers.filter((v) => v.status === 'away').sort((a, b) => b.events - a.events),
    milestones: volunteers.filter((v) => v.milestone).sort((a, b) => b.milestone!.hours - a.milestone!.hours || +b.milestone!.at - +a.milestone!.at),
    badgeReady: volunteers.flatMap((v) => v.badgesReady.map((k) => ({ v, badge: k }))),
    badgeClose: volunteers.flatMap((v) => v.badgesClose.map((c) => ({ v, ...c }))).sort((a, b) => b.progress - a.progress),
    awards,
    index,
    totals,
    series,
  };
}

export type OrgInsights = Awaited<ReturnType<typeof loadOrgInsights>>;
