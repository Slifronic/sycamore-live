// Public opportunities: load db/opportunities.json into the `opportunity` table.
//   npm run db:seed-opportunities     (DATABASE_URL from the shell, else .env.local)
//
// This is real public information, not demo data, so it also runs against
// production. It is safe to run again and again:
//   - rows are matched on slug (from org + title, or a "slug" field in the file)
//   - a new slug is inserted; an existing one has its words and link updated
//   - status and outbound_clicks are never touched, so a listing someone hid
//     stays hidden and click counts survive
//   - verified_on only moves forward
//   - every row is checked first (src/lib/opportunity-rules.ts); one bad row,
//     a link that is not https, or a repeated slug stops the run before
//     anything is written
// A listing removed from the file is NOT removed from the database; the run
// names it so you can hide it:  update opportunity set status = 'hidden' where slug = '…';
// Needs Node 22.18+ (it imports the TypeScript rules directly, like `npm test`).
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateAll } from '../src/lib/opportunity-rules.ts';

const FILE = new URL('./opportunities.json', import.meta.url);

export function readOpportunities() {
  const { rows, errors } = validateAll(JSON.parse(readFileSync(FILE, 'utf8')));
  if (errors.length) throw new Error(`db/opportunities.json has problems, nothing was written:\n  ${errors.join('\n  ')}`);
  return rows;
}

/** Upserts every listing in one transaction. Returns what happened. */
export async function seedOpportunities(sql) {
  const rows = readOpportunities();
  const result = { inserted: 0, updated: 0, unchanged: 0, notInFile: [] };
  await sql.begin(async (tx) => {
    for (const r of rows) {
      const [row] = await tx`
        insert into opportunity (slug, org_name, title, summary, url, org_url, city, category, schedule, min_age, min_age_note, group_friendly, remote, verified_on)
        values (${r.slug}, ${r.org}, ${r.title}, ${r.summary}, ${r.url}, ${r.org_url}, ${r.city}, ${r.category}, ${r.schedule}, ${r.min_age}, ${r.min_age_note}, ${r.group_friendly}, ${r.remote}, ${r.verified_on}::date)
        on conflict (slug) do update set
          org_name = excluded.org_name, title = excluded.title, summary = excluded.summary, url = excluded.url, org_url = excluded.org_url,
          city = excluded.city, category = excluded.category, schedule = excluded.schedule, min_age = excluded.min_age,
          min_age_note = excluded.min_age_note, group_friendly = excluded.group_friendly, remote = excluded.remote,
          verified_on = greatest(opportunity.verified_on, excluded.verified_on),
          updated_at = now()
        where (opportunity.org_name, opportunity.title, opportunity.summary, opportunity.url, opportunity.org_url, opportunity.city, opportunity.category,
               opportunity.schedule, opportunity.min_age, opportunity.min_age_note, opportunity.group_friendly, opportunity.remote)
              is distinct from
              (excluded.org_name, excluded.title, excluded.summary, excluded.url, excluded.org_url, excluded.city, excluded.category,
               excluded.schedule, excluded.min_age, excluded.min_age_note, excluded.group_friendly, excluded.remote)
           or excluded.verified_on > opportunity.verified_on
        returning (xmax = 0) as inserted`;
      if (!row) result.unchanged++;
      else if (row.inserted) result.inserted++;
      else result.updated++;
    }
    const slugs = rows.map((r) => r.slug);
    const extra = await tx`select slug, status from opportunity where source = 'curated' and slug <> all(${slugs}) order by slug`;
    result.notInFile = extra.map((e) => `${e.slug} (${e.status})`);
  });
  return result;
}

// Run directly: `node db/seed-opportunities.mjs`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.DATABASE_URL && existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.DATABASE_URL ?? 'postgres://localhost:5432/sycamore_live';
  const { default: postgres } = await import('postgres');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const r = await seedOpportunities(sql);
    console.log(`Opportunities on ${new URL(url).host}${new URL(url).pathname}: ${r.inserted} added, ${r.updated} updated, ${r.unchanged} unchanged.`);
    if (r.notInFile.length) console.log(`In the database but not in db/opportunities.json (left as they are): ${r.notInFile.join(', ')}`);
  } catch (e) {
    console.error(e.message ?? e);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
