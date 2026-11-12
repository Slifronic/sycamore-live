// Milestones and skills practiced: the library, and the arithmetic behind it.
//
// Both are counted from attested attendance every time a page is read. Nothing
// here is stored, signed or shareable on its own, so a corrected hour or a
// revoked record changes them the moment it lands. A signed badge is different:
// that is a badge_award row a coordinator signed (see badges.ts).
//
// The same rule as badges applies: no skill claims. A milestone states a count.
// A skill area states what the verified hours were spent doing, with the hours
// and events behind it. Neither says how well anyone did anything, and neither
// compares one volunteer with another.
//
// Pure: no database, no network, so the app pages, the public /badges page and
// `npm test` all read the same definitions.
import { ACTIVITY_LABEL, ROLE_LABEL, type Activity, type Role } from './types.ts';

// ---------- what counts ----------

/** One attendance row, as the pages load it. `hours` is the record's figure: adjusted if the coordinator adjusted it, else captured. */
export type Attended = {
  org_id: string;
  org_name: string;
  starts_at: string | Date;
  role: Role;
  activity: Activity;
  hours: number;
  status: string; // only 'attested' counts
  is_practice: boolean;
  revoked?: boolean; // the organization revoked the record
  ref?: string; // the caller's id for this row (a record id), handed back on a reached milestone
};

const PACIFIC = 'America/Los_Angeles';
const monthKey = (d: string | Date) => new Date(d).toLocaleDateString('en-CA', { timeZone: PACIFIC, year: 'numeric', month: '2-digit' });
const time = (d: string | Date) => new Date(d).getTime();
const round2 = (n: number) => Math.round(n * 100) / 100;
const hrs = (n: number) => `${Number.isInteger(n) ? n : round2(n)} verified ${n === 1 ? 'hour' : 'hours'}`;
const evs = (n: number) => `${n} ${n === 1 ? 'event' : 'events'}`;

/**
 * The rows that count, oldest first: attested, not a practice event, not
 * revoked. With `orgId`, only that organization's rows, which is all a
 * coordinator may ever be shown.
 */
export function countable(rows: Attended[], orgId?: string): Attended[] {
  return rows
    .filter((r) => r.status === 'attested' && !r.is_practice && !r.revoked && (orgId === undefined || r.org_id === orgId))
    .sort((a, b) => time(a.starts_at) - time(b.starts_at));
}

// ---------- milestones ----------

/** The verified-hour thresholds. The coordinator's Milestones list and the "Hour milestone" notice use the same five. */
export const HOUR_MILESTONES = [10, 25, 50, 100, 250];
export const MONTH_MILESTONES = [3, 6, 12];
export const ORG_MILESTONE = 2;
/** One mark per activity an event can have: this many verified events and this many verified hours of it. */
export const ACTIVITY_MILESTONE = { events: 3, hours: 9 };
export const ACTIVITIES: Activity[] = ['general', 'planting', 'logistics', 'outreach', 'education'];

const ACTIVITY_SHORT: Record<Activity, string> = {
  general: 'general service',
  planting: 'planting',
  logistics: 'logistics',
  outreach: 'outreach',
  education: 'tutoring',
};
const activityWords = (a: Activity) => ACTIVITY_LABEL[a].replace(' & ', ' and ').toLowerCase();

export type MilestoneUnit = 'hours' | 'months' | 'organizations' | 'events';
export type MilestoneKind = 'hours' | 'months' | 'orgs' | 'activity';

type Tally = {
  hours: number;
  months: Set<string>;
  orgs: Set<string>;
  activityEvents: Record<Activity, number>;
  activityHours: Record<Activity, number>;
};

export type MilestoneDef = {
  key: string;
  kind: MilestoneKind;
  name: string;
  fact: string; // exactly what it states, nothing more
  parts: { label: string; unit: MilestoneUnit; need: number; have: (t: Tally) => number }[];
};

export const MILESTONES: MilestoneDef[] = [
  ...HOUR_MILESTONES.map(
    (n): MilestoneDef => ({
      key: `hours_${n}`,
      kind: 'hours',
      name: `${n} verified hours`,
      fact: `${n} or more verified hours.`,
      parts: [{ label: 'Verified hours', unit: 'hours', need: n, have: (t) => t.hours }],
    }),
  ),
  ...MONTH_MILESTONES.map(
    (n): MilestoneDef => ({
      key: `months_${n}`,
      kind: 'months',
      name: `${n} months of service`,
      fact: `Verified service in ${n} or more different calendar months. The months need not be in a row.`,
      parts: [{ label: 'Calendar months with verified service', unit: 'months', need: n, have: (t) => t.months.size }],
    }),
  ),
  {
    key: `orgs_${ORG_MILESTONE}`,
    kind: 'orgs',
    name: `${ORG_MILESTONE} organizations`,
    fact: `Verified hours at ${ORG_MILESTONE} or more organizations.`,
    parts: [{ label: 'Organizations with verified hours', unit: 'organizations', need: ORG_MILESTONE, have: (t) => t.orgs.size }],
  },
  ...ACTIVITIES.map(
    (a): MilestoneDef => ({
      key: `activity_${a}`,
      kind: 'activity',
      name: `${ACTIVITY_MILESTONE.events} ${ACTIVITY_SHORT[a]} events`,
      fact: `${ACTIVITY_MILESTONE.events} or more verified events and ${ACTIVITY_MILESTONE.hours} or more verified hours of ${activityWords(a)}.`,
      parts: [
        { label: `Verified ${ACTIVITY_SHORT[a]} events`, unit: 'events', need: ACTIVITY_MILESTONE.events, have: (t) => t.activityEvents[a] },
        { label: `Verified hours of ${ACTIVITY_SHORT[a]}`, unit: 'hours', need: ACTIVITY_MILESTONE.hours, have: (t) => t.activityHours[a] },
      ],
    }),
  ),
];

export type MilestoneState = {
  key: string;
  kind: MilestoneKind;
  name: string;
  fact: string;
  parts: { label: string; unit: MilestoneUnit; need: number; have: number }[];
  progress: number; // 0..1, the weakest part
  reached: boolean;
  reached_at: string | null; // start of the event at which the count first met the rule
  reached_ref: string | null; // that row's `ref`, if the caller gave one
};

const zero = () => Object.fromEntries(ACTIVITIES.map((a) => [a, 0])) as Record<Activity, number>;
const met = (d: MilestoneDef, t: Tally) => d.parts.every((p) => p.have(t) >= p.need);

/**
 * Every milestone with have / need, and for the reached ones the event where
 * the count first met the rule. With `orgId` it counts that organization's
 * rows only and leaves out the across-organizations mark.
 */
export function computeMilestones(rows: Attended[], opts: { orgId?: string } = {}): MilestoneState[] {
  const defs = opts.orgId === undefined ? MILESTONES : MILESTONES.filter((d) => d.kind !== 'orgs');
  const t: Tally = { hours: 0, months: new Set(), orgs: new Set(), activityEvents: zero(), activityHours: zero() };
  const at = new Map<string, { at: string; ref: string | null }>();
  for (const r of countable(rows, opts.orgId)) {
    t.hours += r.hours;
    t.months.add(monthKey(r.starts_at));
    t.orgs.add(r.org_id);
    t.activityEvents[r.activity] += 1;
    t.activityHours[r.activity] += r.hours;
    for (const d of defs) if (!at.has(d.key) && met(d, t)) at.set(d.key, { at: new Date(r.starts_at).toISOString(), ref: r.ref ?? null });
  }
  return defs.map((d) => {
    const hit = at.get(d.key);
    return {
      key: d.key,
      kind: d.kind,
      name: d.name,
      fact: d.fact,
      parts: d.parts.map((p) => ({ label: p.label, unit: p.unit, need: p.need, have: round2(p.have(t)) })),
      progress: Math.min(1, ...d.parts.map((p) => p.have(t) / p.need)),
      reached: !!hit,
      reached_at: hit?.at ?? null,
      reached_ref: hit?.ref ?? null,
    };
  });
}

/** Reached milestones, newest first. */
export const reachedMilestones = (all: MilestoneState[]) =>
  all.filter((m) => m.reached).sort((a, b) => (b.reached_at ?? '').localeCompare(a.reached_at ?? ''));

/** The closest milestones not yet reached. Ones with nothing counted yet are left out unless `includeEmpty`. */
export function nextMilestones(all: MilestoneState[], n = 3, includeEmpty = false): MilestoneState[] {
  return all
    .filter((m) => !m.reached && (includeEmpty || m.progress > 0))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, n);
}

/** "12 / 25 hours" or "2 / 3 events · 6 / 9 hours". */
export const milestoneLine = (m: Pick<MilestoneState, 'parts'>) => m.parts.map((p) => `${Math.min(p.have, p.need)} / ${p.need} ${p.unit}`).join(' · ');

// ---------- skills practiced ----------

/**
 * A fixed mapping from the role a coordinator confirmed and the event's
 * activity to a skill area. The keys are skill names Discover already uses
 * (src/lib/discover/taxonomy.ts), so the two sides share one vocabulary.
 * "Practiced" means verified hours were spent on it. It is not a rating.
 * One event can count under several areas, so areas never add up to a total.
 */
export type SkillAreaDef = { key: string; name: string; roles: Role[]; activities: Activity[] };

export const SKILL_AREAS: SkillAreaDef[] = [
  { key: 'leadership', name: 'Leadership', roles: ['team_lead', 'event_coordinator', 'program_manager'], activities: [] },
  { key: 'events', name: 'Running events', roles: ['event_coordinator', 'program_manager'], activities: [] },
  { key: 'project coordination', name: 'Project coordination', roles: ['program_manager'], activities: [] },
  { key: 'planting', name: 'Planting', roles: [], activities: ['planting'] },
  { key: 'conservation', name: 'Conservation', roles: [], activities: ['planting'] },
  { key: 'logistics', name: 'Logistics', roles: [], activities: ['logistics'] },
  { key: 'outreach', name: 'Outreach', roles: [], activities: ['outreach'] },
  { key: 'teaching', name: 'Teaching', roles: [], activities: ['education'] },
  { key: 'community', name: 'Community service', roles: [], activities: ['general'] },
];

const sourceLabel = (kind: 'role' | 'activity', key: string) =>
  kind === 'role' ? `as ${ROLE_LABEL[key as Role].toLowerCase()}` : `of ${activityWords(key as Activity)}`;

/** What produces an area, in words: "Verified hours as team lead, event coordinator or program manager". */
export function skillSource(d: SkillAreaDef): string {
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
  const parts: string[] = [];
  if (d.roles.length) parts.push(`as ${list(d.roles.map((r) => ROLE_LABEL[r].toLowerCase()))}`);
  if (d.activities.length) parts.push(`at ${list(d.activities.map(activityWords))} events`);
  return `Verified hours ${parts.join(', or ')}`;
}

export type SkillLine = {
  key: string;
  name: string;
  hours: number; // each event counted once within the area
  events: number;
  orgs: string[]; // who verified them, most hours first
  sources: { kind: 'role' | 'activity'; key: string; label: string; hours: number; events: number }[];
};

/** Skill areas with at least one verified event behind them, most hours first. `orgId` scopes it to one organization. */
export function computeSkills(rows: Attended[], opts: { orgId?: string } = {}): SkillLine[] {
  const counted = countable(rows, opts.orgId);
  const lines: SkillLine[] = [];
  for (const d of SKILL_AREAS) {
    const mine = counted.filter((r) => d.roles.includes(r.role) || d.activities.includes(r.activity));
    if (mine.length === 0) continue;
    const byOrg = new Map<string, number>();
    for (const r of mine) byOrg.set(r.org_name, (byOrg.get(r.org_name) ?? 0) + r.hours);
    const src = (kind: 'role' | 'activity', key: string, rs: Attended[]) => ({ kind, key, label: sourceLabel(kind, key), hours: round2(rs.reduce((n, r) => n + r.hours, 0)), events: rs.length });
    lines.push({
      key: d.key,
      name: d.name,
      hours: round2(mine.reduce((n, r) => n + r.hours, 0)),
      events: mine.length,
      orgs: [...byOrg.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name),
      sources: [
        ...d.roles.map((role) => src('role', role, mine.filter((r) => r.role === role))),
        ...d.activities.map((act) => src('activity', act, mine.filter((r) => r.activity === act))),
      ].filter((x) => x.events > 0),
    });
  }
  return lines.sort((a, b) => b.hours - a.hours || b.events - a.events);
}

/** "12 verified hours across 4 events as team lead", one clause per role or activity that produced it. */
export const skillSentence = (l: Pick<SkillLine, 'sources'>) => l.sources.map((x) => `${hrs(x.hours)} across ${evs(x.events)} ${x.label}`).join('; ');

/** "as verified by A", "A and B", "A and 2 others". */
export function verifiedBy(orgs: string[]): string {
  if (orgs.length === 0) return '';
  if (orgs.length === 1) return `as verified by ${orgs[0]}`;
  if (orgs.length === 2) return `as verified by ${orgs[0]} and ${orgs[1]}`;
  return `as verified by ${orgs[0]} and ${orgs.length - 1} others`;
}
