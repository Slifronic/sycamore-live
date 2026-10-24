// Real events → the engine's listing shape. Only what the database knows goes
// in; everything else is null ("unknown"), which the engine already turns into
// an interval instead of a guess:
//   known:   the day and time, one event (weeks = 1), in person at a place,
//            the org, the cause and skills from the org's own tags and the
//            event's activity, the goal and the volunteer notes.
//   unknown: travel time and travel cost (we don't know where the volunteer
//            starts), training and support (organizations don't list them yet),
//            required skills (none are listed, so none are assumed).
import { allSkills, causes, groups } from './taxonomy.ts';
import type { Opportunity } from './types.ts';

export type EventListingRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string; // ISO
  ends_at: string;
  activity: 'general' | 'planting' | 'logistics' | 'outreach' | 'education';
  place: string | null; // place name or the free-text location
  address: string | null;
  notes: string | null;
  goal: string | null;
  org_name: string;
  org_city: string | null;
  org_kind: 'nonprofit' | 'school';
  tags: string[]; // the org's tag names on this event
};

export type Listing = Opportunity & {
  slug: string;
  startsAt: string;
  endsAt: string;
  place: string | null;
  address: string | null;
  notes: string | null;
  goal: string | null;
  orgCity: string | null;
  orgKind: 'nonprofit' | 'school';
  tagNames: string[];
};

const TZ = 'America/Los_Angeles';

// What an event's activity says on its own (set by the coordinator on every event).
const ACTIVITY_SKILL: Record<EventListingRow['activity'], string | null> = { general: null, planting: 'planting', logistics: 'logistics', outreach: 'outreach', education: 'teaching' };
const ACTIVITY_CAUSE: Record<EventListingRow['activity'], string | null> = { general: null, planting: 'Environment & Conservation', logistics: null, outreach: null, education: null };
const ACTIVITY_KIND: Record<EventListingRow['activity'], string> = { general: 'General service', planting: 'Tree planting & restoration', logistics: 'Sorting & logistics', outreach: 'Outreach', education: 'Tutoring & education' };

// Org tags that name a cause in other words.
const CAUSE_ALIASES: Record<string, string> = {
  'food access': 'Food Access & Nutrition',
  'food security': 'Food Access & Nutrition',
  environment: 'Environment & Conservation',
  conservation: 'Environment & Conservation',
  education: 'Education & Youth',
  youth: 'Education & Youth',
  'arts': 'Arts & Culture',
  'animal welfare': 'Animal Welfare',
  health: 'Health & Wellbeing',
  housing: 'Housing & Basic Needs',
};

const norm = (s: string) => s.trim().toLowerCase();

export function causeFromTags(tags: string[], activity: EventListingRow['activity']): string | null {
  for (const t of tags) {
    const exact = causes.find((c) => norm(c) === norm(t));
    if (exact) return exact;
    if (CAUSE_ALIASES[norm(t)]) return CAUSE_ALIASES[norm(t)];
  }
  return ACTIVITY_CAUSE[activity];
}

export function skillsFromTags(tags: string[], activity: EventListingRow['activity']): string[] {
  const out = tags.map(norm).filter((t) => allSkills.includes(t));
  const a = ACTIVITY_SKILL[activity];
  if (a && !out.includes(a)) out.push(a);
  return [...new Set(out)];
}

/** The skill group most of the practice skills fall in (first group wins a tie). */
export function areaFor(skills: string[]): string | null {
  let best: string | null = null;
  let n = 0;
  for (const [key, g] of Object.entries(groups)) {
    const k = skills.filter((s) => g.skills.includes(s)).length;
    if (k > n) [best, n] = [key, k];
  }
  return best;
}

export const weekday = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' });
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

export function toListing(e: EventListingRow): Listing {
  const practice = skillsFromTags(e.tags, e.activity);
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    role: e.title,
    org: e.org_name,
    cause: causeFromTags(e.tags, e.activity),
    tags: practice,
    tasks: [],
    day: weekday(e.starts_at),
    time: `${clock(e.starts_at)} to ${clock(e.ends_at)}`,
    weeks: 1,
    travel: { transit: null, car: null, bike: null },
    cost: null,
    support: null,
    supportNote: `${e.org_name} hasn’t listed training or support for this event yet. Ask the coordinator.`,
    training: null,
    status: 'open',
    kind: ACTIVITY_KIND[e.activity],
    outcome: e.goal ?? `${ACTIVITY_KIND[e.activity]} with ${e.org_name}.`,
    area: areaFor(practice),
    format: 'inperson',
    level: 'No prior skills listed',
    required: [],
    practice,
    deliverable: e.goal ?? undefined,
    sourceUrl: null,
    checkedAt: null,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    place: e.place,
    address: e.address,
    notes: e.notes,
    goal: e.goal,
    orgCity: e.org_city,
    orgKind: e.org_kind,
    tagNames: e.tags,
  };
}
