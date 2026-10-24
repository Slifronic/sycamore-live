// Demo seed. All people and the org are made up; the event pattern mirrors
// the team's real pilot (4 planting events, 45/48/52/58 attendances, 3 hours
// each), so the numbers on stage have the same shape as the real thing.
//   node db/seed.mjs            (uses DATABASE_URL or postgres://localhost/sycamore_live)
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { seedIntake } from './seed-intake.mjs';
import { seedDiscover } from './seed-discover.mjs';

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
    p.id = ev.id;
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
  let pantry;
  {
    const starts = at(-20, 13);
    const ends = at(-20, 16);
    const attested = new Date(ends.getTime() + 22 * 3_600_000);
    const ev = await mkEvent({ title: 'Pantry Sort Night', location: 'Westside Community Pantry', starts, ends, code: 'PNTRY5', activity: 'logistics', status: 'closed', closed: attested, goal: 'yes', rating: 5, attested, goalText: 'Sort the weekend food drive', outcome: 'Sorted 1,200 lbs of food into 140 family boxes' });
    const crew = [ana, ...attendees[2].slice(5, 22)];
    pantry = { id: ev.id, crew, sent: at(-19, 9) };
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
  let cleanup;
  {
    // 9 AM to 9 PM today, stretched so it is always on for a while after a
    // reseed (a late-night reseed still gets a live event to check in to).
    const quarter = 15 * 60_000;
    const starts = new Date(Math.min(at(0, 9).getTime(), Math.floor((Date.now() - 3_600_000) / quarter) * quarter));
    const ends = new Date(Math.max(at(0, 21).getTime(), Math.ceil((Date.now() + 4 * 3_600_000) / quarter) * quarter));
    const ev = await mkEvent({ title: 'Guadalupe River Cleanup', location: 'Guadalupe River Park', starts, ends, code: 'PLANT2', activity: 'planting', status: 'open', goalText: 'Clear two miles of riverbank' });
    cleanup = { id: ev.id, crew: attendees[0].slice(3, 8) };
    for (const v of attendees[0].slice(3, 8)) {
      await sql`insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, status)
                values (${ev.id}, ${v.id}, ${v.name}, 'qr', ${addMin(new Date(), -40 - Math.floor(rand() * 30))}, 'checked_in')`;
    }
  }
  // Coming up.
  await mkEvent({ title: 'Earth Day Outreach Table', location: 'Downtown Farmers Market', starts: at(8, 10), ends: at(8, 14), code: 'EARTH6', activity: 'outreach', status: 'open', goalText: 'Sign up 50 new volunteers' });

  // Volunteer side: Ana has a personal goal and has already shared her Phase 1
  // record, so /v/<code> works from the first load. (Codes made in the app are
  // random; this one is fixed so it can go on a slide.) Jay is 16: he can see
  // his records but can't share them.
  await sql`update volunteer set hours_goal = 40 where id = ${ana.id}`;
  await sql`
    update record r set code = 'SYC-RVR7-PLNT', shared_at = r.issued_at + interval '1 day'
    from attendance a where a.id = r.attendance_id and a.event_id = ${plantings[2].id} and r.volunteer_id = ${ana.id}`;

  // One badge already signed, so the volunteer side has something to show.
  await sql`insert into badge_award (org_id, volunteer_id, badge, signed_by, signed_at)
            values (${org.id}, ${ana.id}, 'event_coordination', 'Sam Rivera', ${at(-19, 10)})`;

  // Messages: two past broadcasts with real results, and a few conversations
  // waiting in the inbox. Read, replied and showed-up all come from these rows.
  {
    const msg = (v, direction, body, created, extra = {}) => sql`
      insert into message (org_id, volunteer_id, direction, body, source, broadcast_id, automation_key, dedupe_key, sent_by, created_at, read_at)
      values (${org.id}, ${v.id}, ${direction}, ${body}, ${extra.source ?? 'direct'}, ${extra.broadcast ?? null}, ${extra.automation ?? null},
              ${extra.dedupe ?? null}, ${direction === 'out' ? 'Sam Rivera' : null}, ${created}, ${extra.read ?? null})`;
    const firstName = (v) => v.name.split(' ')[0];

    // 1. The invitation to Phase 2, sent to everyone who came to Phase 1.
    const phase1 = plantings[2];
    const phase2 = plantings[3];
    const sentAt = at(-5, 18, 30);
    const crew = attendees[2];
    const [b1] = await sql`
      insert into broadcast (org_id, title, body, audience, audience_label, event_id, recipients, sent_by, sent_at)
      values (${org.id}, 'Phase 2 invite', ${'Hi {first_name}, thank you for Phase 1! {event} is {date} at {time}, {location}. We’re finishing the south slope. Scan the QR at the sign-in table when you arrive.'},
              ${`event:${phase1.id}`}, ${`Everyone at ${phase1.title}`}, ${phase2.id}, ${crew.length}, 'Sam Rivera', ${sentAt})
      returning id`;
    const replies = ['I’ll be there!', 'Can I come for just the first hour?', 'Count me in, bringing my roommate', 'Sorry, I have a game that day. Next time!', 'Do we need our own gloves?', 'Yes! What should I wear?'];
    let r = 0;
    for (const v of crew) {
      const read = rand() < 0.78 ? addMin(sentAt, 20 + Math.floor(rand() * 900)) : null;
      await msg(v, 'out', `Hi ${firstName(v)}, thank you for Phase 1! ${phase2.title} is ${new Date(at(phase2.day, 9)).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' })} at 9:00 AM, Santa Teresa County Park. We’re finishing the south slope. Scan the QR at the sign-in table when you arrive.`, sentAt, { source: 'broadcast', broadcast: b1.id, read });
      if (read && v !== ana && rand() < 0.22) await msg(v, 'in', replies[r++ % replies.length], addMin(read, 3 + Math.floor(rand() * 40)), { read: addMin(read, 300) });
    }

    // 2. A thank-you after the pantry shift, no event attached.
    const [b2] = await sql`
      insert into broadcast (org_id, title, body, audience, audience_label, event_id, recipients, sent_by, sent_at)
      values (${org.id}, 'Pantry thank-you', ${'Hi {first_name}, thank you for Pantry Sort Night. Your {hours} hours are verified and on your record.'},
              ${`event:${pantry.id}`}, 'Everyone at Pantry Sort Night', null, ${pantry.crew.length}, 'Sam Rivera', ${pantry.sent})
      returning id`;
    for (const v of pantry.crew) {
      const read = rand() < 0.83 ? addMin(pantry.sent, 30 + Math.floor(rand() * 600)) : null;
      await msg(v, 'out', `Hi ${firstName(v)}, thank you for Pantry Sort Night. Your 3 hours are verified and on your record.`, pantry.sent, { source: 'broadcast', broadcast: b2.id, read });
    }
    const pantryFan = pantry.crew[4];
    await msg(pantryFan, 'in', 'That was so fun. Sign me up for the next sort night please!', addMin(pantry.sent, 95), { read: addMin(pantry.sent, 400) });

    // 3. Conversations waiting for Sam.
    await msg(ana, 'out', 'Ana, could you lead the north slope crew again on Saturday? You were great last time.', at(-4, 12, 10), { read: at(-4, 12, 40) });
    await msg(ana, 'in', 'Yes, happy to! Can I bring my cousin? She’s 15.', at(-4, 12, 42), { read: at(-4, 13) });
    await msg(ana, 'out', 'Of course. She can check in with her own phone; anyone 13 or older can join.', at(-4, 13, 5), { read: at(-4, 13, 20) });
    await msg(ana, 'in', 'Great, see you Saturday! Also, is there parking near the south trailhead?', at(-1, 20, 14));

    const forgot = attendees[3][10];
    await msg(forgot, 'in', 'Hi! I forgot to tap Check out on Saturday. I left around 12:15 if that helps.', at(-1, 9, 32));
    await msg(forgot, 'in', 'Sorry about that!', at(-1, 9, 33));

    const slipping = attendees[1].slice(0, 14).find((v) => attendees[0].includes(v) && !attendees[2].includes(v)) ?? attendees[1][0];
    await msg(slipping, 'out', `Hi ${firstName(slipping)}, we miss you at Riverside Restoration Crew! Our next event is Earth Day Outreach Table at the Downtown Farmers Market. Want to come?`, at(-3, 10), { source: 'automation', automation: 'invite_back', dedupe: `invite_back:${slipping.id}:${new Date().toISOString().slice(0, 7)}`, read: at(-2, 19) });
    await msg(slipping, 'in', 'Sorry, finals week! Is there anything on a Sunday this month?', at(0, 8, 5));

    await msg(jay, 'in', 'Do I need a parent to sign anything to get my hours?', at(-6, 16, 2), { read: at(-6, 17) });
    await msg(jay, 'out', 'No signature needed. Your hours are verified by us when we close the event, and they show in My hours. Sharing your record with your school will need a parent or guardian’s OK, and that part isn’t available yet.', at(-6, 17, 4), { read: at(-6, 18, 30) });

    // 4. Event group chats: today's cleanup is happening now; Phase 2 wrapped up two days ago.
    const post = (eventId, v, body, created) => sql`
      insert into event_chat (org_id, event_id, volunteer_id, author_name, body, created_at)
      values (${org.id}, ${eventId}, ${v?.id ?? null}, ${v?.name ?? 'Sam Rivera'}, ${body}, ${created})`;
    const minsAgo = (m) => new Date(Date.now() - m * 60_000);
    const [c1, c2, c3] = cleanup.crew;
    await post(cleanup.id, null, 'Morning all! We’re at the Woz Way entrance by the blue tent. Gloves and grabbers are at the sign-in table.', minsAgo(95));
    await post(cleanup.id, c1, 'Is there parking close by?', minsAgo(88));
    await post(cleanup.id, null, 'The garage on Park Ave is free on weekends. Two-minute walk.', minsAgo(86));
    await post(cleanup.id, c2, 'Found a shopping cart in the river near the bridge. Can someone help pull it out?', minsAgo(31));
    await post(cleanup.id, c3, 'On my way, 5 min', minsAgo(29));
    await sql`insert into event_chat_read (event_id, reader, last_read_at) values (${cleanup.id}, 'org', ${minsAgo(85)})`;

    const p2 = phase2.id;
    const p2crew = attendees[3];
    await post(p2, null, 'Phase 2 tomorrow! Meet at the south trailhead at 9. Rain is out of the forecast.', at(-3, 19));
    await post(p2, p2crew[2], 'Do we need to bring shovels or are there enough?', at(-3, 19, 40));
    await post(p2, null, 'Enough for everyone. Bring water and closed-toe shoes.', at(-3, 20, 5));
    await post(p2, ana, 'Team leads, let’s meet 10 minutes early by the van.', at(-2, 8, 30));
    await post(p2, null, 'Thank you all! 30 trees on the south slope. I’ll verify everyone’s hours this week.', at(-2, 12, 40));
    await post(p2, p2crew[11], 'That was awesome, thanks Sam!', at(-2, 13, 2));
    await sql`insert into event_chat_read (event_id, reader, last_read_at) values (${p2}, 'org', ${at(-2, 13, 30)})`;

    await sql`insert into automation_rule (org_id, key, enabled, body) values
      (${org.id}, 'missing_checkout', true, ${'Hi {first_name}, {event} ended at {time}. You’re still checked in: open SycaMore and tap Check out so your hours count. If you left earlier, reply with the time and {org} will fix it.'}),
      (${org.id}, 'invite_back', true, ${'Hi {first_name}, we miss you at {org}! Our next event is {next_event}. Want to come?'})`;
  }

  await seedIntake(sql, org.id);
  const discoverEvents = await seedDiscover(sql);

  const [t] = await sql`select count(*)::int as n, coalesce(sum(coalesce(hours_adjusted, hours_captured)),0)::float as h from attendance where status = 'attested'`;
  console.log(`Seeded Riverside Restoration Crew (PIN 246810): ${vols.length} volunteers, ${t.n} attested attendances, ${t.h} hours.`);
  console.log(`Seeded 3 more organizations for Discover (PINs 135790, 864202, 975318): ${discoverEvents} upcoming public events.`);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
