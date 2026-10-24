// Ported from sycamore-volunteer-preview/tests/discover.test.cjs at c169374 (11 tests).
// The original topic-based evaluator, against the fixtures it was written for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../../src/lib/discover/engine.ts';
import type { Profile } from '../../src/lib/discover/types.ts';
import { baseOpportunities } from './fixtures.ts';

const data = baseOpportunities();
const p: Profile = { mode: 'experience', topic: 'accounting', day: 'any', transport: 'transit', maxTravel: 45, weeks: 12, maxCost: 15, cause: 'any', reviewed: false, skills: [] };

test('all modes have normalized nonnegative weights', () => {
  for (const w of Object.values(M.weights)) {
    assert.equal(w.reduce((a, b) => a + b, 0), 100);
    assert(w.every((x) => x >= 0));
  }
});
test('unknown background yields an honest score interval', () => {
  const r = M.evaluate(data[0], p);
  assert.equal(r.high - r.low, 20);
  assert.equal(r.knownWeight, 80);
  assert.equal(r.components[1].rating, null);
});
test('interest-only rankings do not depend on resume prestige or skills', () => {
  const a = M.rank(data, { ...p, mode: 'interests' });
  const b = M.rank(data, { ...p, mode: 'interests', reviewed: true, skills: ['accounting', 'tax', 'excel'] });
  assert.deepEqual(a.map((x) => [x.opportunity.id, x.low, x.high]), b.map((x) => [x.opportunity.id, x.low, x.high]));
});
test('changing interests changes the first recommended role', () => {
  assert.equal(M.rank(data, { ...p, mode: 'interests', topic: 'accounting' })[0].opportunity.topic, 'accounting');
  assert.equal(M.rank(data, { ...p, mode: 'interests', topic: 'outdoors' })[0].opportunity.topic, 'outdoors');
});
test('hard travel, day and commitment constraints are enforced', () => {
  const ranked = M.rank(data, { ...p, day: 'Saturday', maxTravel: 25, weeks: 1 });
  assert(ranked.length > 0);
  assert(ranked.every((r) => r.opportunity.day === 'Saturday' && r.opportunity.weeks === 1 && (r.travel === null || r.travel <= 25)));
});
test('unknown travel is conditional, never fabricated', () => {
  const r = M.evaluate(data.find((x) => x.id === 'creek')!, p);
  assert.equal(r.status, 'conditional');
  assert.equal(r.travel, null);
  assert.equal(r.components[6].rating, null);
});
test('tax role retains training requirement even for a strong profile', () => {
  const r = M.evaluate(data[0], { ...p, reviewed: true, skills: ['accounting', 'tax', 'excel'] });
  assert.equal(r.status, 'training');
  assert(r.opportunity.training);
});
test('explicit empty reviewed background scores experience zero, not unknown', () => {
  const r = M.evaluate(data[0], { ...p, reviewed: true });
  assert.equal(r.components[1].rating, 0);
  assert.equal(r.low, r.high);
});
test('out-of-budget roles are excluded, including a zero-cost limit', () => {
  assert.equal(M.rank(data, { ...p, maxCost: 0 }).some((x) => (x.opportunity.cost ?? 0) > 0), false);
});
test('all known scores remain bounded and contributions reconcile', () => {
  for (const mode of Object.keys(M.modes) as Profile['mode'][])
    for (const topic of Object.keys(M.topics))
      for (const o of data) {
        const r = M.evaluate(o, { ...p, mode, topic, reviewed: true, skills: ['budgeting', 'events', 'excel'] });
        assert(r.low >= 0 && r.high <= 100 && r.low <= r.high);
        assert.equal(r.low, Math.round(r.components.reduce((sum, c) => sum + (c.points ?? 0), 0)));
      }
});
test('closed listings cannot enter recommendations', () => {
  assert.equal(M.rank([{ ...data[0], status: 'closed' }], p).length, 0);
});
