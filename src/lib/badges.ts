import type { Activity, Role } from './types';

// Badges from the team's pitch doc (Timothy's badge set), cut to the ones an
// organization can check from attested data. A badge never issues itself:
// the system finds who is ready, and a coordinator signs it off.

export type BadgeKey = 'team_leadership' | 'event_coordination' | 'urban_canopy' | 'resource_logistics';

export type BadgeDef = {
  key: BadgeKey;
  name: string;
  skills: string;
  rule: string;
  needsNote: string | null; // evidence the coordinator writes when signing
  progress: (s: VolunteerStats) => number; // 0..1
};

export type VolunteerStats = {
  eventsByRole: Record<Role, number>;
  hoursByRole: Record<Role, number>;
  hoursByActivity: Record<Activity, number>;
  eventsByActivity: Record<Activity, number>;
};

const min = (...xs: number[]) => Math.min(1, ...xs);

export const BADGES: BadgeDef[] = [
  {
    key: 'team_leadership',
    name: 'Team Leadership',
    skills: 'Leading a crew, delegating, keeping people safe',
    rule: 'Team lead at 3+ events, 9+ attested hours in that role',
    needsNote: null,
    progress: (s) =>
      min(
        (s.eventsByRole.team_lead + s.eventsByRole.event_coordinator + s.eventsByRole.program_manager) / 3,
        (s.hoursByRole.team_lead + s.hoursByRole.event_coordinator + s.hoursByRole.program_manager) / 9,
      ),
  },
  {
    key: 'event_coordination',
    name: 'Event Coordination',
    skills: 'Planning, logistics on the day, running check-in',
    rule: 'Event coordinator or program manager at 2+ events, 6+ hours',
    needsNote: null,
    progress: (s) =>
      min(
        (s.eventsByRole.event_coordinator + s.eventsByRole.program_manager) / 2,
        (s.hoursByRole.event_coordinator + s.hoursByRole.program_manager) / 6,
      ),
  },
  {
    key: 'urban_canopy',
    name: 'Urban Canopy Practitioner',
    skills: 'Field technique, environmental stewardship',
    rule: '10+ attested hours of tree planting or restoration across 3+ events',
    needsNote: 'Planting or bracing technique you saw them use',
    progress: (s) => min(s.hoursByActivity.planting / 10, s.eventsByActivity.planting / 3),
  },
  {
    key: 'resource_logistics',
    name: 'Resource Logistics Organizer',
    skills: 'Organizational planning, inventory',
    rule: '15+ attested hours of sorting or logistics across 2+ events',
    needsNote: 'The system they set up (e.g. a color-coded donation shelf)',
    progress: (s) => min(s.hoursByActivity.logistics / 15, s.eventsByActivity.logistics / 2),
  },
];

export const badgeByKey = Object.fromEntries(BADGES.map((b) => [b.key, b])) as Record<BadgeKey, BadgeDef>;
