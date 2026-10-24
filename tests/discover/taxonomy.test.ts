// Ported from sycamore-volunteer-preview/tests/taxonomy.test.cjs (11 tests).
// The taxonomy evaluator (match-v2.js → match.ts) the app uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../../src/lib/discover/match.ts';
import { extractRoles } from '../../src/lib/discover/taxonomy.ts';
import type { Profile, Role } from '../../src/lib/discover/types.ts';
import { taxonomyOpportunities } from './fixtures.ts';

const data = taxonomyOpportunities();
const byId = (id: string) => data.find((o) => o.id === id)!;
const p: Profile = { taxonomyV2: true, mode: 'experience', roleArea: 'any', format: 'any', cause: 'any', useSkills: ['budgeting'], learnSkills: [], roles: [], reviewed: false, day: 'any', transport: 'transit', maxTravel: 45, weeks: 12, maxCost: 15 };
const role: Role = { id: 'r1', title: 'Club Treasurer', description: 'Created an event budget in Excel.', skills: ['budgeting', 'excel'], evidence: { budgeting: 'Created an event budget in Excel.', excel: 'Created an event budget in Excel.' } };

test('roles preserve the source for budgeting rather than losing its provenance', () => {
  const r = extractRoles('Club Treasurer | Campus Club\nCreated a budget in Excel.\n\nOutreach Helper | Local Club\nDesigned a flyer.');
  assert.equal(r.length, 2);
  assert.equal(r[0].title, 'Club Treasurer');
  assert(r[0].skills.includes('budgeting'));
  assert.equal(r[0].evidence.budgeting, 'Created a budget in Excel.');
  assert(!r[1].skills.includes('budgeting'));
});
test('a reviewed budgeting claim links to its actual role in recommendations', () => {
  const r = M.evaluate(byId('pantry-budget'), { ...p, reviewed: true, roles: [role] });
  assert(r.matched.some((m) => m.skill === 'budgeting' && m.role === 'Club Treasurer' && m.evidence.includes('budget')));
});
test('unreviewed roles cannot supply experience evidence', () => {
  const r = M.evaluate(byId('budget'), { ...p, roles: [role] });
  assert.equal(r.matched.length, 0);
  assert.equal(r.components[1].rating, null);
});
test('using budgeting can discover roles across multiple causes', () => {
  const r = M.rank(data, p).filter((r) => r.useMatches.includes('budgeting'));
  assert(new Set(r.map((x) => x.opportunity.cause)).size >= 2);
});
test('learning skills are compared with practice skills rather than assumed prerequisites', () => {
  const r = M.evaluate(byId('pantry-budget'), { ...p, mode: 'learn', learnSkills: ['cost analysis'] });
  assert(r.learnMatches.includes('cost analysis'));
  assert(!r.opportunity.required!.includes('cost analysis'));
});
test('remote work bypasses commute and travel costs with zero budget', () => {
  const r = M.evaluate(byId('pantry-budget'), { ...p, maxTravel: 0, maxCost: 0 });
  assert.notEqual(r.status, 'excluded');
  assert.equal(r.travel, 0);
  assert.equal(r.components[6].rating, 5);
});
test('hybrid roles still respect journey constraints', () => {
  const r = M.evaluate(byId('budget'), { ...p, maxTravel: 0 });
  assert.equal(r.status, 'excluded');
});
test('formats filter while causes remain preferences', () => {
  assert(M.rank(data, { ...p, format: 'remote' }).every((r) => r.opportunity.format === 'remote'));
  assert(M.rank(data, { ...p, cause: 'Animal Welfare' }).some((r) => r.opportunity.cause !== 'Animal Welfare'));
});
test('interest mode remains independent of role history', () => {
  const a = M.rank(data, { ...p, mode: 'interests', cause: 'Animal Welfare' });
  const b = M.rank(data, { ...p, mode: 'interests', cause: 'Animal Welfare', reviewed: true, roles: [role] });
  assert.deepEqual(a.map((r) => [r.opportunity.id, r.low, r.high]), b.map((r) => [r.opportunity.id, r.low, r.high]));
  assert.equal(a[0].opportunity.cause, 'Animal Welfare');
});
test('required skill gaps trigger a review state, not false readiness', () => {
  const r = M.evaluate(byId('budget'), { ...p, reviewed: true, roles: [] });
  assert.equal(r.status, 'review');
  assert(r.gaps.includes('excel'));
});
test('an unknown route keeps an interval and conditional state', () => {
  const r = M.evaluate(byId('creek'), p);
  assert.equal(r.status, 'conditional');
  assert(r.high > r.low);
});
