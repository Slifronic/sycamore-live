// Impact tracking's pure rules: what a page view counts under, the via tag,
// the bot check, and the skills on public listings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanVia, countedPath, isBot, isApplicationStatus, shareSafe } from '../src/lib/impact-rules.ts';
import { SKILL_WORDS, validateAll, validateOpportunity } from '../src/lib/opportunity-rules.ts';

test('countedPath: static pages and listings keep their path', () => {
  assert.equal(countedPath('/'), '/');
  assert.equal(countedPath('/about'), '/about');
  assert.equal(countedPath('/opportunities'), '/opportunities');
  assert.equal(countedPath('/opportunities/taproot-foundation-pro-bono'), '/opportunities/taproot-foundation-pro-bono');
  assert.equal(countedPath('/opportunities?category=tech'), '/opportunities');
  assert.equal(countedPath('/me/journey'), '/me/journey');
  assert.equal(countedPath('/org/events'), '/org/events');
});

test('countedPath: tokens, codes and ids never reach the database', () => {
  assert.equal(countedPath('/t/K2F9QX'), '/t/[code]');
  assert.equal(countedPath('/v/ABC123'), '/v/[code]');
  assert.equal(countedPath('/w/secret-walkin-token'), '/w/[token]');
  assert.equal(countedPath('/guardian/abc'), '/guardian/[token]');
  assert.equal(countedPath('/confirm/abc'), '/confirm/[token]');
  assert.equal(countedPath('/e/creek-day-0412'), '/e/[event]');
  assert.equal(countedPath('/org/events/4b0c3a1e-1111-2222-3333-444455556666'), '/org/events');
  assert.equal(countedPath('/org/4b0c3a1e-1111-2222-3333-444455556666'), '/org/[id]');
  assert.equal(countedPath('/discover/evt-123'), '/discover/[id]');
});

test('countedPath: the dashboard, the API, redirects and junk are not counted', () => {
  for (const p of ['/impact', '/impact/export', '/api/beacon', '/opportunities/go/x', '/_next/static/a.js', 'about', '', '/nope', '/about/extra', '/opportunities/Bad_Slug', 42, null])
    assert.equal(countedPath(p), null, String(p));
  assert.equal(countedPath('/' + 'a'.repeat(400)), null);
});

test('cleanVia: short lowercase tags only', () => {
  assert.equal(cleanVia('Khanh-IG'), 'khanh-ig');
  assert.equal(cleanVia('  bryant '), 'bryant');
  assert.equal(cleanVia('a'.repeat(33)), null);
  assert.equal(cleanVia('two words'), null);
  assert.equal(cleanVia('-x'), null);
  assert.equal(cleanVia('<script>'), null);
  assert.equal(cleanVia(undefined), null);
});

test('isBot: crawlers and empty agents are skipped, browsers are not', () => {
  assert(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)'));
  assert(isBot('facebookexternalhit/1.1'));
  assert(isBot('curl/8.4.0'));
  assert(isBot(''));
  assert(isBot(null));
  assert(!isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'));
});

test('application statuses', () => {
  for (const s of ['applied', 'accepted', 'completed', 'withdrawn']) assert(isApplicationStatus(s));
  assert(!isApplicationStatus('hired'));
});

const base = {
  org: 'Taproot Foundation', title: 'Pro bono projects', summary: 'Skilled volunteering.', url: 'https://taprootfoundation.org/opportunities', org_url: null,
  city: 'Remote', category: 'other', schedule: null, min_age: null, min_age_note: null, group_friendly: false, verified_on: '2026-11-22', remote: true,
};

test('listing skills: optional, from Discover’s vocabulary, at most 8, no repeats', () => {
  const ok = validateOpportunity(base);
  assert(ok.ok && ok.row.skills.length === 0);
  const named = validateOpportunity({ ...base, skills: ['design', 'market research'] });
  assert(named.ok && named.row.skills.join() === 'design,market research');
  assert(!validateOpportunity({ ...base, skills: ['juggling'] }).ok);
  assert(!validateOpportunity({ ...base, skills: ['design', 'design'] }).ok);
  assert(!validateOpportunity({ ...base, skills: SKILL_WORDS.slice(0, 9) }).ok);
  assert(!validateOpportunity({ ...base, skills: 'design' }).ok);
});

test('the listings file: every listing names its skills, and Taproot is on the board', () => {
  const { rows, errors } = validateAll(JSON.parse(readFileSync(new URL('../db/opportunities.json', import.meta.url), 'utf8')));
  assert.deepEqual(errors, []);
  assert(rows.every((r) => r.skills.length > 0), rows.filter((r) => !r.skills.length).map((r) => r.slug).join(', '));
  assert(rows.some((r) => r.org === 'Taproot Foundation' && r.remote));
});

import { matchListings, matchReason } from '../src/lib/discover/listing-match.ts';

test('Discover listing match: learn beats use beats past, ties keep board order, no overlap is left out', () => {
  const ls = [
    { slug: 'warehouse', skills: ['logistics', 'inventory'] },
    { slug: 'taproot', skills: ['market research', 'design', 'writing'] },
    { slug: 'hack-night', skills: ['web development', 'design'] },
    { slug: 'tutor', skills: ['tutoring'] },
  ];
  const m = matchListings(ls, { learn: ['design'], use: ['writing'], past: ['logistics'] });
  assert.deepEqual(m.map((x) => x.listing.slug), ['taproot', 'hack-night', 'warehouse']);
  assert.deepEqual(m[0]!.learn, ['design']);
  assert.deepEqual(m[0]!.use, ['writing']);
  assert.equal(matchReason(m[0]!), 'Builds design, which you want to learn.');
  assert.equal(matchReason({ learn: [], use: ['writing', 'editing'], past: [] }), 'Uses writing and editing, which you already do.');
  assert.equal(matchReason({ learn: [], use: [], past: ['logistics', 'events', 'outreach'] }), 'Uses logistics, events and outreach, from your past roles.');
  assert.deepEqual(matchListings(ls, { learn: [], use: [], past: [] }), []);
  assert.deepEqual(matchListings(ls, { learn: ['juggling'], use: [], past: [] }), []);
  assert.equal(matchListings(ls, { learn: ['design', 'logistics', 'tutoring'], use: [], past: [] }, 2).length, 2);
});

test('shareSafe: public counts under 5 are hidden, so no one is picked out', () => {
  assert.equal(shareSafe(0), null);
  assert.equal(shareSafe(4), null);
  assert.equal(shareSafe(5), 5);
  assert.equal(shareSafe(524.5), 524.5);
  assert.equal(shareSafe(Number.NaN), null);
  assert.equal(countedPath('/our-impact'), '/our-impact');
});
