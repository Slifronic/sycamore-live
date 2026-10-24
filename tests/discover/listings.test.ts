// Real events mapped into the engine: nothing the database lacks is invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toListing, type EventListingRow } from '../../src/lib/discover/listings.ts';
import { rank } from '../../src/lib/discover/match.ts';
import type { Profile } from '../../src/lib/discover/types.ts';

const row = (over: Partial<EventListingRow>): EventListingRow => ({
  id: '00000000-0000-4000-8000-000000000001', slug: 'abcdef0123', title: 'Homework Help Night', starts_at: '2026-10-28T23:00:00.000Z', ends_at: '2026-10-29T01:00:00.000Z',
  activity: 'education', place: 'Mayfair Community Center', address: null, notes: null, goal: 'Help 30 students', org_name: 'Eastside Learning Circle', org_city: 'San José, CA', org_kind: 'nonprofit',
  tags: ['Tutoring', 'Mentoring', 'Education & Youth'], ...over,
});
const p: Profile = { taxonomyV2: true, mode: 'experience', roleArea: 'any', format: 'any', cause: 'any', useSkills: [], learnSkills: [], roles: [], reviewed: false, day: 'any', transport: 'transit', maxTravel: 45, weeks: 12, maxCost: 15 };

test('tags become the cause and practice skills; the activity adds its own skill', () => {
  const l = toListing(row({}));
  assert.equal(l.cause, 'Education & Youth');
  assert.deepEqual(l.practice, ['tutoring', 'mentoring', 'teaching']);
  assert.equal(l.area, 'teaching');
  assert.equal(l.day, 'Wednesday');
  assert.deepEqual(l.required, []);
});
test('travel, cost and support stay unknown, so the score is an interval', () => {
  const l = toListing(row({}));
  assert.deepEqual(l.travel, { transit: null, car: null, bike: null });
  assert.equal(l.cost, null);
  assert.equal(l.support, null);
  const [r] = rank([l], p);
  assert.equal(r.status, 'conditional');
  assert(r.high > r.low);
  assert.equal(r.components[4].points, null);
  assert.equal(r.components[6].points, null);
});
test('changing the cause or the skills re-ranks real listings', () => {
  const pantry = toListing(row({ id: '00000000-0000-4000-8000-000000000002', title: 'Distribution Shift', activity: 'logistics', tags: ['Distribution', 'Food Access & Nutrition'] }));
  const tutoring = toListing(row({}));
  assert.equal(rank([pantry, tutoring], { ...p, mode: 'interests', cause: 'Food Access & Nutrition' })[0].opportunity.title, 'Distribution Shift');
  assert.equal(rank([pantry, tutoring], { ...p, mode: 'interests', cause: 'Education & Youth' })[0].opportunity.title, 'Homework Help Night');
  assert.equal(rank([pantry, tutoring], { ...p, useSkills: ['logistics'] })[0].opportunity.title, 'Distribution Shift');
});
test('an alias tag like "Food access" maps to its cause; untagged events have no cause', () => {
  assert.equal(toListing(row({ tags: ['Food access'], activity: 'logistics' })).cause, 'Food Access & Nutrition');
  assert.equal(toListing(row({ tags: [], activity: 'general' })).cause, null);
});
