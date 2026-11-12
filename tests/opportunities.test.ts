// The public opportunities board: the slug, the row check, the filter reader,
// and the listings file itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CATEGORIES, NO_FILTERS, ageLabel, checkedLabel, cityKey, filterQuery, hasFilters, isSlug, matches, opportunitySlug, readFilters, validateAll, validateOpportunity,
} from '../src/lib/opportunity-rules.ts';

const good = {
  org: 'Our City Forest', title: 'Tree nursery workdays', summary: 'Grow and plant trees.', url: 'https://www.ourcityforest.org/volunteers', org_url: 'https://www.ourcityforest.org/',
  city: 'San Jose', category: 'tree_planting', schedule: 'Sat 9am-2pm', min_age: null, min_age_note: null, group_friendly: true, verified_on: '2026-11-12', remote: false,
};
const errorsOf = (over: Record<string, unknown>) => {
  const c = validateOpportunity({ ...good, ...over });
  return c.ok ? [] : c.errors;
};

test('slug: lowercase words joined by hyphens', () => {
  assert.equal(opportunitySlug('Our City Forest', 'Tree nursery workdays & community plantings'), 'our-city-forest-tree-nursery-workdays-and-community-plantings');
  assert.equal(opportunitySlug('  Friends of “Los Gatos” Creek ', 'Clean-ups!'), 'friends-of-los-gatos-creek-clean-ups');
  assert.equal(opportunitySlug('San José Parks', 'Rose garden (Sat.)'), 'san-jose-parks-rose-garden-sat');
  assert.equal(opportunitySlug("Children's Discovery Museum", 'Docents'), 'childrens-discovery-museum-docents');
});
test('slug: at most 96 characters, cut at a word, always a valid slug', () => {
  const long = opportunitySlug('Midpeninsula Regional Open Space District of the Greater Bay Area', 'Open space preserve stewardship projects and docent training for everyone');
  assert(long.length <= 96, String(long.length));
  assert(isSlug(long), long);
  assert(!long.endsWith('-'));
  assert('midpeninsula-regional-open-space-district-of-the-greater-bay-area-open-space-preserve-stewardship-projects-and-docent-training-for-everyone'.startsWith(long));
  assert.equal(opportunitySlug('x'.repeat(200), 'y').length, 96); // no word boundary to cut at
});
test('isSlug refuses anything that could be a path or a URL', () => {
  for (const bad of ['', 'A', 'a--b', '-a', 'a-', 'a/b', '../x', 'https://evil.example', 'a b', 'a'.repeat(97), null, 5]) assert(!isSlug(bad), String(bad));
  assert(isSlug('a-1-b'));
});

test('a complete row passes and gets its slug', () => {
  const c = validateOpportunity(good);
  assert(c.ok);
  assert.equal(c.row.slug, 'our-city-forest-tree-nursery-workdays');
  assert.equal(c.row.remote, false);
});
test('only https links are accepted', () => {
  for (const url of ['http://www.ourcityforest.org/volunteers', 'javascript:alert(1)', 'data:text/html,hi', '//evil.example/x', 'ftp://example.org/a', 'https://user:pw@example.org/', 'https://localhost/x', ' https://example.org', 'https://exa mple.org', '', null, 7]) {
    assert(errorsOf({ url }).some((e) => e.startsWith('url:')), `url ${String(url)} should be refused`);
  }
  assert(errorsOf({ org_url: 'http://example.org' }).some((e) => e.startsWith('org_url:')));
  assert(errorsOf({ org_url: 'javascript:void(0)' }).some((e) => e.startsWith('org_url:')));
  assert.deepEqual(errorsOf({ org_url: null }), []);
});
test('missing or wrong fields are named', () => {
  for (const key of ['org', 'title', 'summary', 'city', 'url', 'category', 'verified_on']) {
    const row: Record<string, unknown> = { ...good };
    delete row[key];
    const c = validateOpportunity(row);
    assert(!c.ok && c.errors.some((e) => e.startsWith(`${key}:`)), `missing ${key}`);
  }
  assert(errorsOf({ title: '   ' }).length > 0);
  assert(errorsOf({ category: 'gardening' }).length > 0);
  assert(errorsOf({ min_age: 14.5 }).length > 0);
  assert(errorsOf({ min_age: '14' }).length > 0);
  assert(errorsOf({ min_age: -1 }).length > 0);
  assert(errorsOf({ group_friendly: 'yes' }).length > 0);
  assert(errorsOf({ remote: 'no' }).length > 0);
  assert(errorsOf({ verified_on: '2026-02-30' }).length > 0);
  assert(errorsOf({ verified_on: '11/12/2026' }).length > 0);
  assert(errorsOf({ slug: 'Not A Slug' }).length > 0);
  assert(!validateOpportunity(null).ok && !validateOpportunity([good]).ok && !validateOpportunity('x').ok);
});
test('a slug in the file wins over the derived one', () => {
  const c = validateOpportunity({ ...good, slug: 'ocf-nursery' });
  assert(c.ok && c.row.slug === 'ocf-nursery');
});
test('two rows with one slug are an error', () => {
  const { errors } = validateAll([good, { ...good, summary: 'Again.' }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /same slug as row 1/);
  assert.deepEqual(validateAll({}).rows, []);
});

test('filters: read from GET params, ignoring anything unrecognized', () => {
  assert.deepEqual(readFilters({}), NO_FILTERS);
  assert.deepEqual(readFilters({ category: 'distribution', age: '16' }), { category: 'distribution', city: null, remote: false, age: 16 });
  assert.deepEqual(readFilters({ category: 'nope', city: '  ', remote: '0', age: 'sixteen' }), NO_FILTERS);
  assert.deepEqual(readFilters({ category: ['arts', 'tech'], city: ' San Jose ', remote: 'on', age: ' 9 ' }), { category: 'arts', city: 'San Jose', remote: true, age: 9 });
  for (const age of ['-3', '3', '1e2', '100', '16.5', '16; drop table', '']) assert.equal(readFilters({ age }).age, null, age);
  assert.equal(readFilters({ remote: '1' }).remote, true);
  assert.equal(readFilters({ city: 'x'.repeat(200) }).city?.length, 60);
  assert(!hasFilters(NO_FILTERS) && hasFilters(readFilters({ age: '15' })));
});
test('filters: back to a query string', () => {
  assert.equal(filterQuery(NO_FILTERS), '');
  assert.equal(filterQuery({ category: 'distribution', city: 'San Jose', remote: true, age: 16 }), '?category=distribution&city=San+Jose&remote=1&age=16');
  assert.deepEqual(readFilters(Object.fromEntries(new URLSearchParams(filterQuery({ category: 'tech', city: 'Palo Alto', remote: false, age: 13 })))), { category: 'tech', city: 'Palo Alto', remote: false, age: 13 });
});
test('filters: matching', () => {
  const o = { category: 'distribution' as const, city: 'San Jose', remote: false, min_age: 14 };
  assert(matches(o, NO_FILTERS));
  assert(matches(o, readFilters({ category: 'distribution', city: 'san josé, CA', age: '16' })));
  assert(!matches(o, readFilters({ category: 'arts' })));
  assert(!matches(o, readFilters({ city: 'Oakland' })));
  assert(!matches(o, readFilters({ remote: '1' })));
  assert(!matches(o, readFilters({ age: '13' })));
  assert(matches(o, readFilters({ age: '14' })));
  // No stated minimum: kept for every age, and labelled as not listed.
  assert(matches({ ...o, min_age: null }, readFilters({ age: '10' })));
  assert.equal(ageLabel(null), 'Minimum age not listed');
  assert.equal(ageLabel(16), 'Ages 16+');
  assert.equal(cityKey('San José, CA'), 'san jose');
  assert.equal(checkedLabel('2026-11-12'), 'Nov 12, 2026');
});

test('db/opportunities.json: every row is valid, https, and has its own slug', () => {
  const raw = JSON.parse(readFileSync(new URL('../db/opportunities.json', import.meta.url), 'utf8'));
  const { rows, errors } = validateAll(raw);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, raw.length);
  assert(rows.length >= 30, `${rows.length} listings`);
  assert.equal(new Set(rows.map((r) => r.slug)).size, rows.length);
  for (const r of rows) {
    assert(isSlug(r.slug), r.slug);
    assert(r.url.startsWith('https://'), r.url);
    assert(r.org_url === null || r.org_url.startsWith('https://'), String(r.org_url));
    assert((CATEGORIES as readonly string[]).includes(r.category), r.category);
    assert(r.verified_on <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), `${r.slug} is checked in the future`);
  }
});
