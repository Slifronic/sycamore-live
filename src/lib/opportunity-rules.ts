// The public opportunities board's rules, with no database and no imports, so
// the seed script (db/seed-opportunities.mjs), the tests and the pages all use
// the same slug, the same row check and the same filter reading.
// Plain erasable TypeScript only: Node runs this file directly.

export const CATEGORIES = [
  'tree_planting',
  'habitat_restoration',
  'creek_cleanup',
  'distribution',
  'tutoring',
  'logistics',
  'animals',
  'seniors',
  'arts',
  'tech',
  'civic',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  tree_planting: 'Tree planting',
  habitat_restoration: 'Habitat restoration',
  creek_cleanup: 'Creek and beach cleanup',
  distribution: 'Food distribution',
  tutoring: 'Tutoring and mentoring',
  logistics: 'Sorting and logistics',
  animals: 'Animals',
  seniors: 'Seniors',
  arts: 'Arts and culture',
  tech: 'Tech and digital',
  civic: 'Civic',
  other: 'Other',
};

export const isCategory = (v: unknown): v is Category => typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);

/** One row of db/opportunities.json, after validation. */
export type OpportunityInput = {
  slug: string;
  org: string;
  title: string;
  summary: string;
  url: string;
  org_url: string | null;
  city: string;
  category: Category;
  schedule: string | null;
  min_age: number | null;
  min_age_note: string | null;
  group_friendly: boolean | null;
  remote: boolean;
  verified_on: string; // YYYY-MM-DD
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX = 96;

export const isSlug = (v: unknown): v is string => typeof v === 'string' && v.length <= SLUG_MAX && SLUG.test(v);

/** "Our City Forest" + "Tree nursery workdays" → "our-city-forest-tree-nursery-workdays" (at most 96, cut at a word). */
export function opportunitySlug(org: string, title: string): string {
  const s = `${org} ${title}`
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length <= SLUG_MAX) return s;
  const cut = s.slice(0, SLUG_MAX);
  const at = cut.lastIndexOf('-');
  return (s[SLUG_MAX] === '-' || at < 40 ? cut : cut.slice(0, at)).replace(/-+$/, '');
}

/** An https URL with a real host and no sign-in part; anything else is null. */
export function httpsUrl(v: unknown): string | null {
  if (typeof v !== 'string' || v !== v.trim() || v.length > 500 || /\s/.test(v)) return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) return null;
  return v;
}

const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null);

function isDay(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export type Checked = { ok: true; row: OpportunityInput } | { ok: false; errors: string[] };

/** Checks one listing as written in db/opportunities.json. Nothing is guessed: a bad field is an error. */
export function validateOpportunity(raw: unknown): Checked {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, errors: ['not an object'] };
  const r = raw as Record<string, unknown>;

  const org = text(r.org, 120);
  const title = text(r.title, 140);
  const summary = text(r.summary, 400);
  const city = text(r.city, 60);
  if (!org) errors.push('org: required, at most 120 characters');
  if (!title) errors.push('title: required, at most 140 characters');
  if (!summary) errors.push('summary: required, at most 400 characters');
  if (!city) errors.push('city: required, at most 60 characters');

  const url = httpsUrl(r.url);
  if (!url) errors.push('url: must be an https:// link');
  const orgUrl = r.org_url == null ? null : httpsUrl(r.org_url);
  if (r.org_url != null && !orgUrl) errors.push('org_url: must be an https:// link or null');

  if (!isCategory(r.category)) errors.push(`category: must be one of ${CATEGORIES.join(', ')}`);

  const optional = (key: string, max: number): string | null => {
    const v = r[key];
    if (v == null) return null;
    const t = text(v, max);
    if (!t) errors.push(`${key}: must be text of at most ${max} characters, or null`);
    return t;
  };
  const schedule = optional('schedule', 200);
  const minAgeNote = optional('min_age_note', 240);

  const minAge = r.min_age ?? null;
  if (minAge !== null && !(typeof minAge === 'number' && Number.isInteger(minAge) && minAge >= 0 && minAge <= 99)) errors.push('min_age: must be a whole number from 0 to 99, or null');

  const group = r.group_friendly ?? null;
  if (group !== null && typeof group !== 'boolean') errors.push('group_friendly: must be true, false or null');
  const remote = r.remote ?? false;
  if (typeof remote !== 'boolean') errors.push('remote: must be true or false');

  if (!isDay(r.verified_on)) errors.push('verified_on: must be a real date written YYYY-MM-DD');

  let slug = '';
  if (r.slug != null) {
    if (isSlug(r.slug)) slug = r.slug;
    else errors.push('slug: lowercase letters, digits and single hyphens, at most 96 characters');
  } else if (org && title) {
    slug = opportunitySlug(org, title);
    if (!isSlug(slug)) errors.push('slug: org and title leave nothing to make a slug from');
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    row: {
      slug,
      org: org!,
      title: title!,
      summary: summary!,
      url: url!,
      org_url: orgUrl,
      city: city!,
      category: r.category as Category,
      schedule,
      min_age: minAge as number | null,
      min_age_note: minAgeNote,
      group_friendly: group as boolean | null,
      remote: remote as boolean,
      verified_on: r.verified_on as string,
    },
  };
}

/** Checks the whole file: every row valid and every slug used once. */
export function validateAll(rows: unknown): { rows: OpportunityInput[]; errors: string[] } {
  if (!Array.isArray(rows)) return { rows: [], errors: ['the file must hold a list of listings'] };
  const out: OpportunityInput[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();
  rows.forEach((raw, i) => {
    const c = validateOpportunity(raw);
    if (!c.ok) {
      errors.push(...c.errors.map((e) => `row ${i + 1}: ${e}`));
      return;
    }
    const first = seen.get(c.row.slug);
    if (first !== undefined) errors.push(`row ${i + 1}: same slug as row ${first + 1} (${c.row.slug})`);
    else seen.set(c.row.slug, i);
    out.push(c.row);
  });
  return { rows: out, errors };
}

// ── Filters: plain GET params on /opportunities ─────────────────────────────

export type Filters = {
  category: Category | null;
  /** As typed, trimmed; compared with cityKey. */
  city: string | null;
  /** Only listings done from home. */
  remote: boolean;
  /** The visitor's age: listings whose stated minimum is higher are left out. */
  age: number | null;
};

export const NO_FILTERS: Filters = { category: null, city: null, remote: false, age: null };

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads ?category=&city=&remote=&age=. Anything unrecognized is ignored, never an error. */
export function readFilters(params: Params): Filters {
  const category = first(params.category);
  const city = first(params.city)?.trim().slice(0, 60);
  const remote = first(params.remote);
  const ageText = first(params.age)?.trim() ?? '';
  const age = /^\d{1,2}$/.test(ageText) ? Number(ageText) : null;
  return {
    category: isCategory(category) ? category : null,
    city: city ? city : null,
    remote: remote === '1' || remote === 'true' || remote === 'on',
    age: age !== null && age >= 5 ? age : null,
  };
}

export const hasFilters = (f: Filters) => Boolean(f.category || f.city || f.remote || f.age !== null);

/** "San José, CA" and "san jose" are the same city. */
export const cityKey = (city: string) =>
  city
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/,\s*[A-Za-z]{2}\.?$/, '')
    .trim()
    .toLowerCase();

/** "San José, CA" → "San Jose": the name the city filter lists. */
export const cityName = (city: string) =>
  city
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/,\s*[A-Za-z]{2}\.?$/, '')
    .trim();

type Filterable = { category: Category; city: string | null; remote: boolean; min_age: number | null };

/**
 * A listing with no stated minimum age is kept (the card says "not listed"):
 * hiding it would wrongly tell a 15-year-old there is nothing for them.
 */
export function matches(o: Filterable, f: Filters): boolean {
  if (f.category && o.category !== f.category) return false;
  if (f.remote && !o.remote) return false;
  if (f.city && (o.city === null || cityKey(o.city) !== cityKey(f.city))) return false;
  if (f.age !== null && o.min_age !== null && o.min_age > f.age) return false;
  return true;
}

/** The filters as a query string ("" when none), for links that keep or drop one. */
export function filterQuery(f: Filters): string {
  const q = new URLSearchParams();
  if (f.category) q.set('category', f.category);
  if (f.city) q.set('city', f.city);
  if (f.remote) q.set('remote', '1');
  if (f.age !== null) q.set('age', String(f.age));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const ageLabel = (minAge: number | null) => (minAge === null ? 'Minimum age not listed' : minAge === 0 ? 'All ages' : `Ages ${minAge}+`);

/** "2026-11-12" → "Nov 12, 2026". */
export const checkedLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
