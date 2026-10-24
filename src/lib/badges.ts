import type { Activity, Role } from './types';

// Badges from the team's pitch doc (Timothy's badge set), cut to the ones an
// organization can check from attested data. A badge never issues itself:
// the system finds who is ready, and a coordinator signs it off.

export type BadgeKey = 'team_leadership' | 'event_coordination' | 'urban_canopy' | 'resource_logistics';

// One measurable part of a badge's rule, e.g. "events in a lead role, need 3".
export type BadgeTarget = { label: string; unit: 'events' | 'hours'; need: number; have: (s: VolunteerStats) => number };

export type BadgeDef = {
  key: BadgeKey;
  name: string;
  skills: string;
  rule: string;
  needsNote: string | null; // evidence the coordinator writes when signing
  targets: BadgeTarget[]; // the rule, as numbers; progress is the weakest part
  progress: (s: VolunteerStats) => number; // 0..1
};

export type VolunteerStats = {
  eventsByRole: Record<Role, number>;
  hoursByRole: Record<Role, number>;
  hoursByActivity: Record<Activity, number>;
  eventsByActivity: Record<Activity, number>;
};

const ROLE_KEYS: Role[] = ['general', 'team_lead', 'event_coordinator', 'program_manager'];
const ACTIVITY_KEYS: Activity[] = ['general', 'planting', 'logistics', 'outreach', 'education'];
const zeros = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export const emptyStats = (): VolunteerStats => ({
  eventsByRole: zeros(ROLE_KEYS),
  hoursByRole: zeros(ROLE_KEYS),
  hoursByActivity: zeros(ACTIVITY_KEYS),
  eventsByActivity: zeros(ACTIVITY_KEYS),
});

/** Adds one attested attendance to a volunteer's stats (the org dashboard and the volunteer side share this). */
export function addAttendance(s: VolunteerStats, a: { role: Role; activity: Activity; hours: number }) {
  s.eventsByRole[a.role] += 1;
  s.hoursByRole[a.role] += a.hours;
  s.eventsByActivity[a.activity] += 1;
  s.hoursByActivity[a.activity] += a.hours;
}

const sum = (r: Record<string, number>, keys: string[]) => keys.reduce((n, k) => n + (r[k] ?? 0), 0);
const LEAD: Role[] = ['team_lead', 'event_coordinator', 'program_manager'];
const COORD: Role[] = ['event_coordinator', 'program_manager'];

// Progress is the weakest part of the rule, capped at 1.
const fromTargets = (targets: BadgeTarget[]) => (s: VolunteerStats) => Math.min(1, ...targets.map((t) => t.have(s) / t.need));

export const BADGES: BadgeDef[] = ([
  {
    key: 'team_leadership',
    name: 'Team Leadership',
    skills: 'Leading a crew, delegating, keeping people safe',
    rule: 'Team lead at 3+ events, 9+ attested hours in that role',
    needsNote: null,
    targets: [
      { label: 'Events as team lead or above', unit: 'events', need: 3, have: (s) => sum(s.eventsByRole, LEAD) },
      { label: 'Attested hours in that role', unit: 'hours', need: 9, have: (s) => sum(s.hoursByRole, LEAD) },
    ],
  },
  {
    key: 'event_coordination',
    name: 'Event Coordination',
    skills: 'Planning, logistics on the day, running check-in',
    rule: 'Event coordinator or program manager at 2+ events, 6+ hours',
    needsNote: null,
    targets: [
      { label: 'Events as coordinator or program manager', unit: 'events', need: 2, have: (s) => sum(s.eventsByRole, COORD) },
      { label: 'Attested hours in those roles', unit: 'hours', need: 6, have: (s) => sum(s.hoursByRole, COORD) },
    ],
  },
  {
    key: 'urban_canopy',
    name: 'Urban Canopy Practitioner',
    skills: 'Field technique, environmental stewardship',
    rule: '10+ attested hours of tree planting or restoration across 3+ events',
    needsNote: 'Planting or bracing technique you saw them use',
    targets: [
      { label: 'Attested hours of planting or restoration', unit: 'hours', need: 10, have: (s) => s.hoursByActivity.planting },
      { label: 'Planting or restoration events', unit: 'events', need: 3, have: (s) => s.eventsByActivity.planting },
    ],
  },
  {
    key: 'resource_logistics',
    name: 'Resource Logistics Organizer',
    skills: 'Organizational planning, inventory',
    rule: '15+ attested hours of sorting or logistics across 2+ events',
    needsNote: 'The system they set up (e.g. a color-coded donation shelf)',
    targets: [
      { label: 'Attested hours of sorting or logistics', unit: 'hours', need: 15, have: (s) => s.hoursByActivity.logistics },
      { label: 'Sorting or logistics events', unit: 'events', need: 2, have: (s) => s.eventsByActivity.logistics },
    ],
  },
] as Omit<BadgeDef, 'progress'>[]).map((b) => ({ ...b, progress: fromTargets(b.targets) }));

export const badgeByKey = Object.fromEntries(BADGES.map((b) => [b.key, b])) as Record<BadgeKey, BadgeDef>;
