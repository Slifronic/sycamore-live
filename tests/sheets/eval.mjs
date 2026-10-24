// Scores the paper-sheet import against tests/sheets/expected.json.
// Needs the dev server running with ANTHROPIC_API_KEY set:
//   npm run dev -- -p 3311     then     node tests/sheets/eval.mjs
// Uses its own org (PIN 999999), so the demo data is untouched. Nothing is
// saved to the roster: the import endpoint only returns drafts.
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const BASE = process.env.APP_URL ?? 'http://localhost:3311';
const HERE = new URL('.', import.meta.url);
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://localhost:5432/sycamore_live', { max: 1, onnotice: () => {} });
const expected = JSON.parse(readFileSync(new URL('expected.json', HERE), 'utf8'));

const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
function close(a, b) {
  // Levenshtein distance <= 2 counts as the same name (a misread letter is still the right row).
  a = norm(a); b = norm(b);
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] <= 2;
}
const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' }) : null);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

async function main() {
  await sql`insert into org (name, contact_phone, contact_email, coordinator_name, coordinator_pin)
            values ('Sheet Import Eval', '000', 'eval@example.test', 'Eval', '999999') on conflict (coordinator_pin) do nothing`;
  const login = await fetch(`${BASE}/api/org/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: '999999' }) });
  if (!login.ok) throw new Error(`login failed: ${login.status}`);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  let rows = 0, right = 0, leaked = 0, flagged = 0, flaggable = 0;
  for (const [file, sheet] of Object.entries(expected)) {
    const ev = await fetch(`${BASE}/api/org/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ title: `Eval ${file}`, starts_at: `${today}T${sheet.event.start}:00-07:00`, ends_at: `${today}T${sheet.event.end}:00-07:00` }),
    }).then((r) => r.json());
    const form = new FormData();
    form.append('image', new Blob([readFileSync(new URL(file, HERE))], { type: 'image/jpeg' }), file);
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/org/events/${ev.event.id}/import-sheet`, { method: 'POST', headers: { cookie }, body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(`${file}: ${data.error}`);
    const drafts = data.drafts;
    console.log(`\n${file}  (${((Date.now() - t0) / 1000).toFixed(1)} s, ${drafts.length} drafts)`);

    const used = new Set();
    for (const exp of sheet.rows) {
      rows++;
      const i = drafts.findIndex((d, k) => !used.has(k) && close(d.display_name, exp.name));
      if (i < 0) { console.log(`  MISSING  ${exp.name}`); continue; }
      used.add(i);
      const d = drafts[i];
      const got = { in: hhmm(d.checked_in_at), out: hhmm(d.checked_out_at) };
      const unclear = exp.in === null; // the smudged time: a correct answer is null or a flag
      if (unclear) {
        flaggable++;
        if (got.in === null || d.confidence < 0.8 || d.notes) flagged++;
      }
      const ok = (unclear ? true : got.in === exp.in) && got.out === exp.out;
      if (ok) right++;
      console.log(`  ${ok ? 'ok      ' : 'WRONG   '} ${exp.name.padEnd(14)} in ${String(got.in).padEnd(5)} (want ${exp.in ?? 'flag'})  out ${String(got.out).padEnd(5)} (want ${exp.out ?? 'none'})  ${Math.round(d.confidence * 100)}%${d.notes ? `  · ${d.notes}` : ''}`);
    }
    drafts.forEach((d, k) => {
      if (!used.has(k)) { leaked++; console.log(`  EXTRA    ${d.display_name}${d.notes ? `  · ${d.notes}` : ''}`); }
    });
  }
  console.log(`\nRows exactly right before review: ${right} of ${rows} (${Math.round((100 * right) / rows)}%)`);
  console.log(`Unclear times flagged: ${flagged} of ${flaggable}`);
  console.log(`Rows that should not exist (crossed out / injection): ${leaked}`);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e.message);
  await sql.end();
  process.exit(1);
});
