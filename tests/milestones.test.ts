// Milestones and skills practiced: counted from attested attendance, never stored.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITIES, HOUR_MILESTONES, MILESTONES, SKILL_AREAS, computeMilestones, computeSkills, countable, milestoneLine, nextMilestones,
  reachedMilestones, skillSentence, skillSource, verifiedBy, type Attended,
} from '../src/lib/milestones.ts';
import { allSkills } from '../src/lib/discover/taxonomy.ts';

const A = 'org-a';
const B = 'org-b';
let n = 0;
const row = (over: Partial<Attended> = {}): Attended => ({
  org_id: A, org_name: 'Riverside Restoration Crew', starts_at: `2026-0${1 + (n % 9)}-15T17:00:00Z`, role: 'general', activity: 'general',
  hours: 3, status: 'attested', is_practice: false, ref: `r${++n}`, ...over,
});
const get = (rows: Attended[], key: string, orgId?: string) => computeMilestones(rows, { orgId }).find((m) => m.key === key)!;

test('the library has every milestone the product names', () => {
  assert.deepEqual(HOUR_MILESTONES, [10, 25, 50, 100, 250]);
  assert.deepEqual(MILESTONES.map((m) => m.key), [
    'hours_10', 'hours_25', 'hours_50', 'hours_100', 'hours_250', 'months_3', 'months_6', 'months_12', 'orgs_2',
    ...ACTIVITIES.map((a) => `activity_${a}`),
  ]);
  assert.equal(new Set(MILESTONES.map((m) => m.name)).size, MILESTONES.length);
});

test('an hour milestone is reached at the threshold, not a quarter hour before', () => {
  const under = [row({ hours: 5 }), row({ hours: 4.75 })];
  assert.equal(get(under, 'hours_10').reached, false);
  assert.equal(get(under, 'hours_10').parts[0].have, 9.75);
  assert.equal(milestoneLine(get(under, 'hours_10')), '9.75 / 10 hours');
  const exact = [row({ hours: 5 }), row({ hours: 5 })];
  assert.equal(get(exact, 'hours_10').reached, true);
  assert.equal(get(exact, 'hours_10').progress, 1);
  assert.equal(get(exact, 'hours_25').reached, false);
});

test('a reached milestone names the event where the count first met the rule', () => {
  const rows = [
    row({ starts_at: '2026-03-01T17:00:00Z', hours: 4, ref: 'first' }),
    row({ starts_at: '2026-05-01T17:00:00Z', hours: 4, ref: 'third' }),
    row({ starts_at: '2026-04-01T17:00:00Z', hours: 4, ref: 'second' }),
  ];
  const m = get(rows, 'hours_10');
  assert.equal(m.reached_ref, 'third'); // 4 + 4 = 8, then 12 at the May event, whatever order the rows arrive in
  assert.equal(m.reached_at, '2026-05-01T17:00:00.000Z');
  assert.equal(get(rows, 'hours_25').reached_at, null);
});

test('pending, no-show, practice and revoked rows never count', () => {
  const rows = [
    row({ hours: 6 }),
    row({ hours: 6, status: 'checked_out' }),
    row({ hours: 6, status: 'checked_in' }),
    row({ hours: 6, status: 'no_show' }),
    row({ hours: 6, is_practice: true }),
    row({ hours: 6, revoked: true }),
  ];
  assert.equal(countable(rows).length, 1);
  assert.equal(get(rows, 'hours_10').reached, false);
  assert.equal(get(rows, 'hours_10').parts[0].have, 6);
  assert.deepEqual(computeSkills(rows).map((s) => [s.key, s.hours, s.events]), [['community', 6, 1]]);
});

test('months count distinct Pacific calendar months', () => {
  const two = [
    row({ starts_at: '2026-03-05T17:00:00Z' }),
    row({ starts_at: '2026-03-20T17:00:00Z' }),
    row({ starts_at: '2026-05-01T05:00:00Z' }), // 10 PM on Apr 30 in California
  ];
  assert.equal(get(two, 'months_3').parts[0].have, 2);
  assert.equal(get(two, 'months_3').reached, false);
  const three = [...two, row({ starts_at: '2026-05-02T17:00:00Z', ref: 'may' })];
  assert.equal(get(three, 'months_3').reached, true);
  assert.equal(get(three, 'months_3').reached_ref, 'may');
});

test('the two-organization mark needs verified hours at both', () => {
  assert.equal(get([row(), row()], 'orgs_2').reached, false);
  assert.equal(get([row(), row({ org_id: B, org_name: 'Eastside Pantry', status: 'checked_out' })], 'orgs_2').reached, false);
  assert.equal(get([row(), row({ org_id: B, org_name: 'Eastside Pantry' })], 'orgs_2').reached, true);
});

test('an activity mark needs both 3 events and 9 hours', () => {
  const p = (hours: number) => row({ activity: 'planting', hours });
  assert.equal(get([p(3), p(3)], 'activity_planting').reached, false); // 2 events
  assert.equal(get([p(3), p(3), p(2.75)], 'activity_planting').reached, false); // 3 events, 8.75 hours
  assert.equal(get([p(4.5), p(4.5)], 'activity_planting').reached, false); // 9 hours, 2 events
  assert.equal(get([p(3), p(3), p(2.75)], 'activity_planting').progress, 8.75 / 9);
  assert.equal(get([p(3), p(3), p(3)], 'activity_planting').reached, true);
  assert.equal(get([p(3), p(3), p(3)], 'activity_logistics').reached, false);
});

test('next milestones are the closest unreached ones that have something counted', () => {
  const all = computeMilestones([row({ hours: 8, activity: 'outreach' })]);
  assert.deepEqual(nextMilestones(all, 3).map((m) => m.key), ['hours_10', 'orgs_2', 'months_3']); // ties keep library order
  assert.equal(nextMilestones(computeMilestones([]), 3).length, 0);
  assert.equal(nextMilestones(computeMilestones([]), 3, true).length, 3);
  assert.equal(reachedMilestones(all).length, 0);
});

test('skill areas reuse Discover’s skill names', () => {
  for (const a of SKILL_AREAS) assert(allSkills.includes(a.key), a.key);
  assert.equal(skillSource(SKILL_AREAS[0]), 'Verified hours as team lead, event coordinator or program manager');
  assert.equal(skillSource(SKILL_AREAS.find((a) => a.key === 'planting')!), 'Verified hours at tree planting and restoration events');
});

test('skill areas overlap, and each names what produced it', () => {
  const rows = [
    row({ role: 'team_lead', activity: 'planting', hours: 3 }),
    row({ role: 'team_lead', activity: 'planting', hours: 3 }),
    row({ role: 'event_coordinator', activity: 'logistics', hours: 4 }),
    row({ role: 'general', activity: 'planting', hours: 2 }),
  ];
  const by = Object.fromEntries(computeSkills(rows).map((s) => [s.key, s]));
  assert.deepEqual(Object.keys(by).sort(), ['conservation', 'events', 'leadership', 'logistics', 'planting']);
  assert.equal(by.leadership.hours, 10);
  assert.equal(by.leadership.events, 3);
  assert.equal(skillSentence(by.leadership), '6 verified hours across 2 events as team lead; 4 verified hours across 1 event as event coordinator');
  assert.equal(by.planting.hours, 8);
  assert.equal(skillSentence(by.planting), '8 verified hours across 3 events of tree planting and restoration');
  assert.equal(by.events.hours, 4);
  // The same event sits under several areas, so the areas add up to more than was served.
  const served = rows.reduce((s, r) => s + r.hours, 0);
  assert(Object.values(by).reduce((s, l) => s + l.hours, 0) > served);
  assert.equal(verifiedBy(by.leadership.orgs), 'as verified by Riverside Restoration Crew');
  assert.equal(verifiedBy(['A', 'B']), 'as verified by A and B');
  assert.equal(verifiedBy(['A', 'B', 'C']), 'as verified by A and 2 others');
});

test('an organization’s view counts only its own rows', () => {
  const rows = [
    row({ org_id: A, hours: 6, role: 'team_lead', activity: 'planting' }),
    row({ org_id: B, org_name: 'Eastside Pantry', hours: 6, activity: 'logistics' }),
    row({ org_id: B, org_name: 'Eastside Pantry', hours: 6, activity: 'logistics' }),
  ];
  assert.equal(get(rows, 'hours_10').reached, true); // the volunteer's own view: 18 hours
  assert.equal(get(rows, 'hours_10', A).reached, false);
  assert.equal(get(rows, 'hours_10', A).parts[0].have, 6);
  assert.equal(get(rows, 'hours_10', B).reached, true);
  assert.equal(computeMilestones(rows, { orgId: A }).some((m) => m.kind === 'orgs'), false);
  const a = computeSkills(rows, { orgId: A });
  assert.deepEqual(a.map((s) => s.key).sort(), ['conservation', 'leadership', 'planting']);
  assert(a.every((s) => s.orgs.length === 1 && s.orgs[0] === 'Riverside Restoration Crew'));
  assert.deepEqual(computeSkills(rows, { orgId: B }).map((s) => [s.key, s.hours]), [['logistics', 12]]);
  assert.equal(computeMilestones(rows, { orgId: 'someone-else' }).every((m) => !m.reached && m.progress === 0), true);
});
