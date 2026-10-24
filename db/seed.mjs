// Demo seed. All people and the org are made up; the event pattern mirrors
// the team's real pilot (4 planting events, 45/48/52/58 attendances, 3 hours
// each), so the numbers on stage have the same shape as the real thing.
//   node db/seed.mjs            (uses DATABASE_URL or postgres://localhost/sycamore_live)
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL ?? 'postgres://localhost:5432/sycamore_live';
const sql = postgres(url, { max: 1, onnotice: () => {} });

// Deterministic pseudo-random so every reseed looks the same.
let s = 20261023;
const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];

const FIRST = ['Ana', 'Marcus', 'Jordan', 'Priya', 'Diego', 'Mei', 'Tariq', 'Sofia', 'Ethan', 'Leila', 'Kai', 'Noor', 'Mateo', 'Hana', 'Owen', 'Isabel', 'Ravi', 'Chloe', 'Andre', 'Yuna', 'Luis', 'Grace', 'Samir', 'Elena', 'Theo', 'Amara', 'Jonah', 'Lina', 'Dev', 'Rosa', 'Caleb', 'Mina', 'Felix', 'Aisha', 'Hugo', 'Tara', 'Ben', 'Zara', 'Nico', 'Iris', 'Omar', 'Lucia', 'Ezra', 'Maya', 'Arjun', 'Nadia', 'Leo', 'Kiara', 'Sam', 'Vera'];
const LAST = ['Reyes', 'Tran', 'Lee', 'Shah', 'Morales', 'Chen', 'Haddad', 'Rossi', 'Nguyen', 'Kaur', 'Park', 'Okafor', 'Silva', 'Kim', 'Brooks', 'Diaz', 'Patel', 'Martin', 'Lopez', 'Sato', 'Garcia', 'Ali', 'Wong', 'Novak', 'Hayes', 'Mendes', 'Cruz', 'Ito', 'Baker', 'Flores'];

// Pacific-time timestamp N days from today at h:m.
const today = new Date();
const at = (daysFromToday, h, m = 0) => {
  const d = new Date(today.getTime() + daysFromToday * 86_400_000);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
  return new Date(`${ymd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-07:00`);
};
const addMin = (d, m) => new Date(d.getTime() + m * 60_000);

async function main() {
  await sql.unsafe(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));

  const [org] = await sql`
    insert into org (name, contact_phone, contact_email, coordinator_name, coordinator_pin, kind, city, course)
    values ('Riverside Restoration Crew', '(408) 555-0142', 'sam@riverside.test', 'Sam Rivera', '246810', 'nonprofit', 'San José, CA', '{}')
    returning id`;

  // Volunteers: two fixed contract accounts, then a pool.
  const vols = [];
  const addVol = async (name, email, dob) => {
    const [v] = await sql`insert into volunteer (name, email, date_of_birth) values (${name}, ${email}, ${dob}) returning id, name`;
    vols.push(v);
    return v;
  };
  const ana = await addVol('Ana Reyes', 'ana@example.test', '2007-04-12'); // 19
  const jay = await addVol('Jay Patel', 'jay@example.test', '2010-02-03'); // 16
  const used = new Set(['Ana Reyes', 'Jay Patel']);
  while (vols.length < 118) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    if (used.has(name)) continue;
    used.add(name);
    const year = 2005 + Math.floor(rand() * 6); // 15 to 21 years old
    await addVol(name, `${name.toLowerCase().replace(' ', '.')}@example.test`, `${year}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`);
  }
  const pool = vols.slice(2);

  const mkEvent = async (e) => {
    const [row] = await sql`
      insert into event (org_id, title, location, starts_at, ends_at, checkin_code, status, closed_at, activity, goal_outcome, cohort_rating, attested_at, goal_text, outcome_text)
      values (${org.id}, ${e.title}, ${e.location}, ${e.starts}, ${e.ends}, ${e.code}, ${e.status}, ${e.closed ?? null},
              ${e.activity}, ${e.goal ?? null}, ${e.rating ?? null}, ${e.attested ?? null}, ${e.goalText ?? null}, ${e.outcome ?? null})
      returning *`;
    return row;
  };

  // Who comes to which planting event. Returning volunteers are drawn from earlier events.
  const attendees = [];
  const plantings = [
    { title: 'Coyote Creek Planting', location: 'Coyote Creek Trail, San José', day: -63, n: 45, verifyLagH: 20, goal: 'yes', rating: 5, goalText: 'Plant 20 oaks and willows', outcome: 'Planted 22 trees, mulched all of them' },
    { title: 'Berryessa Creek Planting', location: 'Berryessa Creek Park, San José', day: -49, n: 48, verifyLagH: 18, goal: 'yes', rating: 4, goalText: 'Plant 25 trees along the creek', outcome: 'Planted 26 trees' },
    { title: 'Santa Teresa Planting, Phase 1', location: 'Santa Teresa County Park', day: -35, n: 52, verifyLagH: 70, goal: 'partly', rating: 4, goalText: 'Plant 35 trees on the north slope', outcome: 'Planted 28 trees; rain closed the upper trail' },
    { title: 'Santa Teresa Planting, Phase 2', location: 'Santa Teresa County Park', day: -2, n: 58, verifyLagH: null, goal: null, rating: null, goalText: 'Plant 30 trees on the south slope' },
  ];
  let fresh = 0;
  for (const [i, p] of plantings.entries()) {
    const seen = [...new Set(attendees.flat())];
    const set = new Set();
    if (i >= 1) set.add(ana);
    if (i === 1 || i === 2) set.add(jay);
    // About 40% of each crew are returning volunteers, the rest are first-timers.
    const returning = Math.round(p.n * (i === 0 ? 0 : 0.42));
    // Event 4 deliberately skips a group who came to 1 and 2 (they're "slipping").
    const skip = i === 3 ? new Set(attendees[1].slice(0, 14)) : new Set();
    for (const v of seen.sort(() => rand() - 0.5)) {
      if (set.size >= returning) break;
      if (!skip.has(v) && v !== jay) set.add(v);
    }
    while (set.size < p.n) set.add(pool[fresh++ % pool.length]);
    attendees.push([...set]);
  }

  const codes = ['CYOTE4', 'BRYSA8', 'STRSA3', 'STRSB7'];
  for (const [i, p] of plantings.entries()) {
    const starts = at(p.day, 9);
    const ends = at(p.day, 12);
    const attested = p.verifyLagH != null ? new Date(ends.getTime() + p.verifyLagH * 3_600_000) : null;
    const ev = await mkEvent({
      title: p.title, location: p.location, starts, ends, code: codes[i], activity: 'planting',
      status: attested ? 'closed' : 'open', closed: attested, goal: p.goal, rating: p.rating, attested, goalText: p.goalText, outcome: p.outcome,
    });
    for (const [j, v] of attendees[i].entries()) {
      const inAt = addMin(starts, Math.floor(rand() * 8) - 3);
      let outAt = addMin(inAt, 180 + Math.floor(rand() * 11) - 5);
      let adjusted = null;
      let reason = null;
      // One honest correction on Phase 1, the kind the printed reason exists for.
      if (i === 2 && j === 7) {
        outAt = addMin(inAt, 90);
        adjusted = 3;
        reason = 'Phone died at 10:30; stayed to finish mulching. Confirmed by the team lead.';
      }
      const hours = Math.round((outAt - inAt) / 900_000) * 0.25;
      let role = 'general';
      if (v === ana) role = 'team_lead';
      else if (j % 9 === 1) role = 'team_lead';
      else if (j === 2 || j === 3) role = 'event_coordinator';
      else if (j === 4 && i === 2) role = 'program_manager';
      const standout = attested ? (v === ana || rand() < 0.07) : false;
      const [a] = await sql`
        insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, checked_out_at, hours_captured,
          hours_adjusted, adjustment_reason, role, status, attested_at, standout)
        values (${ev.id}, ${v.id}, ${v.name}, ${rand() < 0.85 ? 'qr' : 'code'}, ${inAt}, ${outAt}, ${hours},
          ${adjusted}, ${reason}, ${attested ? role : 'general'}, ${attested ? 'attested' : 'checked_out'}, ${attested}, ${standout})
        returning id`;
      if (attested) await sql`insert into record (attendance_id, volunteer_id, org_id, issued_at) values (${a.id}, ${v.id}, ${org.id}, ${attested})`;
    }
  }

  // A sorting shift at a food pantry partner (logistics hours for that badge).
  {
    const starts = at(-20, 13);
    const ends = at(-20, 16);
    const attested = new Date(ends.getTime() + 22 * 3_600_000);
    const ev = await mkEvent({ title: 'Pantry Sort Night', location: 'Westside Community Pantry', starts, ends, code: 'PNTRY5', activity: 'logistics', status: 'closed', closed: attested, goal: 'yes', rating: 5, attested, goalText: 'Sort the weekend food drive', outcome: 'Sorted 1,200 lbs of food into 140 family boxes' });
    const crew = [ana, ...attendees[2].slice(5, 22)];
    for (const v of crew) {
      const inAt = addMin(starts, Math.floor(rand() * 6));
      const outAt = addMin(inAt, 180);
      const [a] = await sql`
        insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, checked_out_at, hours_captured, role, status, attested_at)
        values (${ev.id}, ${v.id}, ${v.name}, 'qr', ${inAt}, ${outAt}, 3, ${v === ana ? 'event_coordinator' : 'general'}, 'attested', ${attested})
        returning id`;
      await sql`insert into record (attendance_id, volunteer_id, org_id, issued_at) values (${a.id}, ${v.id}, ${org.id}, ${attested})`;
    }
  }

  // Open today, for live testing (code from the contract).
  {
    const ev = await mkEvent({ title: 'Guadalupe River Cleanup', location: 'Guadalupe River Park', starts: at(0, 9), ends: at(0, 21), code: 'PLANT2', activity: 'planting', status: 'open', goalText: 'Clear two miles of riverbank' });
    for (const v of attendees[0].slice(3, 8)) {
      await sql`insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, status)
                values (${ev.id}, ${v.id}, ${v.name}, 'qr', ${addMin(new Date(), -40 - Math.floor(rand() * 30))}, 'checked_in')`;
    }
  }
  // Coming up.
  await mkEvent({ title: 'Earth Day Outreach Table', location: 'Downtown Farmers Market', starts: at(8, 10), ends: at(8, 14), code: 'EARTH6', activity: 'outreach', status: 'open', goalText: 'Sign up 50 new volunteers' });

  // One badge already signed, so the volunteer side has something to show.
  await sql`insert into badge_award (org_id, volunteer_id, badge, signed_by, signed_at)
            values (${org.id}, ${ana.id}, 'event_coordination', 'Sam Rivera', ${at(-19, 10)})`;

  const [t] = await sql`select count(*)::int as n, coalesce(sum(coalesce(hours_adjusted, hours_captured)),0)::float as h from attendance where status = 'attested'`;
  console.log(`Seeded Riverside Restoration Crew (PIN 246810): ${vols.length} volunteers, ${t.n} attested attendances, ${t.h} hours.`);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
