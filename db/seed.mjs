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

// Pacific-time timestamp N days from today at h:m, correct across daylight
// saving (a fixed -07:00 put November events an hour early). Same two-pass
// conversion as zonedToUtc in src/lib/tz.ts, inlined so the seed stays plain JS.
const TZ = 'America/Los_Angeles';
const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const offsetMinutes = (d) => {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - d.getTime()) / 60_000);
};
const pacificToUtc = (ymd, h, m) => {
  const [y, mo, da] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, m);
  let t = guess - offsetMinutes(new Date(guess)) * 60_000;
  t = guess - offsetMinutes(new Date(t)) * 60_000;
  return new Date(t);
};
const today = new Date();
const at = (daysFromToday, h, m = 0) => {
  const d = new Date(today.getTime() + daysFromToday * 86_400_000);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  return pacificToUtc(ymd, h, m);
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
    v.dob = dob;
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
  // Volunteers under 18 get announcements only: no direct messages and no event
  // group chats (src/lib/minors.ts). Seeded replies and chat posts come from adults.
  const adult = (v) => {
    const d = new Date(`${v.dob}T00:00:00Z`);
    const n = new Date();
    return n.getUTCFullYear() - d.getUTCFullYear() - (n.getUTCMonth() < d.getUTCMonth() || (n.getUTCMonth() === d.getUTCMonth() && n.getUTCDate() < d.getUTCDate()) ? 1 : 0) >= 18;
  };
  const firstAdult = (xs, from = 0) => [...xs.slice(from), ...xs.slice(0, from)].find(adult);

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
    // Event 4 deliberately skips a group who came to 1 and 2 (they haven't come in 30+ days).
    const skip = i === 3 ? new Set(attendees[1].slice(0, 14)) : new Set();
    for (const v of seen.sort(() => rand() - 0.5)) {
      if (set.size >= returning) break;
      if (!skip.has(v) && v !== jay) set.add(v);
    }
    while (set.size < p.n) set.add(pool[fresh++ % pool.length]);
    attendees.push([...set]);
  }

  const codes = ['CYOTE4', 'BRYSA8', 'STRSA3', 'STRSB7'];
  // Phase 2 (unverified) has four people who never scanned out, so the verify
  // screen has a "Fill in 4 who didn't scan out" to show. One of them messages
  // Sam about it below. Ana scanned out normally: the demo changes her hours.
  const p2Forgot = firstAdult(attendees[3], 10);
  const p2NoCheckout = new Set([p2Forgot, attendees[3][23], attendees[3][37], attendees[3][49]].filter((v) => v !== ana));
  const p2Missing = [];
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
      const noCheckout = i === 3 && p2NoCheckout.has(v);
      if (noCheckout) outAt = null;
      const hours = outAt ? Math.round((outAt - inAt) / 900_000) * 0.25 : 0;
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
          ${adjusted}, ${reason}, ${attested ? role : 'general'}, ${attested ? 'attested' : noCheckout ? 'checked_in' : 'checked_out'}, ${attested}, ${standout})
        returning id`;
      if (noCheckout) p2Missing.push({ v, attendanceId: a.id });
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

  // Today's walk-in event (code from the contract). It always reads as an
  // ordinary morning, 9:00 AM to 1:00 PM Pacific, whenever the seed runs; judging
  // runs until 12:30, so it is live all through it. Seeded after 1 PM (a late
  // rehearsal), the event shows as ended, but its walk-in link stays open for
  // 4 hours from the seed so the walk-in QR can still be scanned.
  let cleanup;
  {
    const quarter = 15 * 60_000;
    const now = Date.now();
    const starts = at(0, 9);
    const ends = at(0, 13);
    const ev = await mkEvent({ title: 'Guadalupe River Cleanup', location: 'Guadalupe River Park', starts, ends, code: 'PLANT2', activity: 'planting', status: 'open', goalText: 'Clear two miles of riverbank' });
    if (now > ends.getTime()) await sql`update event set walkin_until = ${new Date(Math.ceil((now + 4 * 3_600_000) / quarter) * quarter)} where id = ${ev.id}`;
    // Five adults checked in about 40 to 70 minutes ago, inside the event's hours
    // (they post in the event's group chat below).
    const crew = [...attendees[0].slice(3), ...attendees[0].slice(0, 3)].filter(adult).slice(0, 5);
    cleanup = { id: ev.id, crew };
    for (const v of crew) {
      const ago = 40 + Math.floor(rand() * 30);
      const inAt = now > ends.getTime() ? addMin(starts, ago - 35) : new Date(Math.max(now - ago * 60_000, Math.min(now, starts.getTime() - 10 * 60_000)));
      await sql`insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, status)
                values (${ev.id}, ${v.id}, ${v.name}, 'qr', ${inAt}, 'checked_in')`;
    }
  }
  // Coming up.
  await mkEvent({ title: 'Earth Day Outreach Table', location: 'Downtown Farmers Market', starts: at(8, 10), ends: at(8, 14), code: 'EARTH6', activity: 'outreach', status: 'open', goalText: 'Sign up 50 new volunteers' });

  // Volunteer side: Ana has a personal goal and has already shared her Phase 1
  // record, so /v/<code> works from the first load. (Codes made in the app are
  // random; this one is fixed so it can go on a slide.) Jay is 16: he can see
  // his records but can't share them.
  await sql`update volunteer set hours_goal = 40 where id = ${ana.id}`;
  // Everyone in the demo agreed to the Terms when they joined. About three in
  // five adults turned announcements on (a stable pick by email, so reseeds
  // match); no one under 18 is opted in.
  await sql`update volunteer set terms_accepted_at = created_at where terms_accepted_at is null`;
  await sql`
    update volunteer set marketing_opt_in = true, marketing_opt_in_at = terms_accepted_at
    where date_of_birth <= current_date - interval '18 years'
      and (id = ${ana.id} or abs(hashtext(email)) % 5 < 3)`;
  // The 13 to 17s also confirmed a parent or guardian knows (guardian_ack_at).
  await sql`update volunteer set guardian_ack_at = terms_accepted_at where date_of_birth > current_date - interval '18 years'`;
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
      if (read && v !== ana && rand() < 0.22 && adult(v)) await msg(v, 'in', replies[r++ % replies.length], addMin(read, 3 + Math.floor(rand() * 40)), { read: addMin(read, 300) });
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
    const pantryFan = firstAdult(pantry.crew, 4);
    await msg(pantryFan, 'in', 'That was so fun. Sign me up for the next sort night please!', addMin(pantry.sent, 95), { read: addMin(pantry.sent, 400) });

    // 3. Conversations waiting for Sam.
    await msg(ana, 'out', 'Ana, could you lead the north slope crew again on Saturday? You were great last time.', at(-4, 12, 10), { read: at(-4, 12, 40) });
    await msg(ana, 'in', 'Yes, happy to! Can I bring my cousin? She’s 15.', at(-4, 12, 42), { read: at(-4, 13) });
    await msg(ana, 'out', 'Of course. She can check in with her own phone; anyone 13 or older can join.', at(-4, 13, 5), { read: at(-4, 13, 20) });
    await msg(ana, 'in', 'Great, see you Saturday! Also, is there parking near the south trailhead?', at(-1, 20, 14));

    // The missing-check-out reminder already went to the four who never scanned
    // out of Phase 2, and one of them wrote back.
    for (const { v, attendanceId } of p2Missing)
      await msg(v, 'out', `Hi ${firstName(v)}, ${phase2.title} ended at 12:00 PM. You’re still checked in: open SycaMore and tap Check out so your hours count. If you left earlier, reply with the time and Riverside Restoration Crew will fix it.`, at(phase2.day, 12, 30), { source: 'automation', automation: 'missing_checkout', dedupe: `missing_checkout:${attendanceId}`, read: v === p2Forgot ? at(-1, 9, 30) : null });
    const forgot = p2Forgot;
    const p2Weekday = at(phase2.day, 9).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long' });
    await msg(forgot, 'in', `Hi! I forgot to tap Check out on ${p2Weekday}. I left around 12:15 if that helps.`, at(-1, 9, 32));
    await msg(forgot, 'in', 'Sorry about that!', at(-1, 9, 33));

    const away = attendees[1].find((v) => adult(v) && attendees[0].includes(v) && !attendees[2].includes(v)) ?? firstAdult(attendees[1]);
    await msg(away, 'out', `Hi ${firstName(away)}, we miss you at Riverside Restoration Crew! Our next event is Earth Day Outreach Table at the Downtown Farmers Market. Want to come?`, at(-3, 10), { source: 'automation', automation: 'invite_back', dedupe: `invite_back:${away.id}:${new Date().toISOString().slice(0, 7)}`, read: at(-2, 19) });
    await msg(away, 'in', 'Sorry, finals week! Is there anything on a Sunday this month?', at(0, 8, 5));

    // Jay is 16: no direct messages either way (lib/minors.ts), so his thread
    // holds only the announcements above.

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
    const p2crew = attendees[3].filter(adult);
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
  await seedOtherOrgsForAna(ana);

  const [t] = await sql`select count(*)::int as n, coalesce(sum(coalesce(a.hours_adjusted, a.hours_captured)),0)::float as h from attendance a join event e on e.id = a.event_id where a.status = 'attested' and e.org_id = ${org.id}`;
  console.log(`Seeded Riverside Restoration Crew (PIN 246810): ${vols.length} volunteers, ${t.n} attested attendances, ${t.h} hours.`);
  console.log(`Seeded 3 more organizations for Discover (PINs 135790, 864202, 975318): ${discoverEvents} upcoming public events.`);
  await sql.end();
}

// Ana also serves with two of the Discover organizations, so the volunteer
// home shows three folders. Three past, verified events in Sep and Oct with
// six made-up regulars; nothing here touches Riverside's numbers.
async function seedOtherOrgsForAna(ana) {
  const regulars = [
    ['Rhea Castillo', 'rhea.castillo@example.test', '2003-08-14'],
    ['Malik Johnson', 'malik.johnson@example.test', '2001-11-02'],
    ['Bea Lindqvist', 'bea.lindqvist@example.test', '2004-02-19'],
    ['Tomas Ferreira', 'tomas.ferreira@example.test', '2002-06-30'],
    ['Ines Duarte', 'ines.duarte@example.test', '2005-01-09'],
    ['Kofi Mensah', 'kofi.mensah@example.test', '2000-09-21'],
  ];
  const who = { 'ana@example.test': ana };
  for (const [i, [name, email, dob]] of regulars.entries()) {
    const joined = at(-54 + i, 18);
    const [v] = await sql`insert into volunteer (name, email, date_of_birth, created_at, terms_accepted_at) values (${name}, ${email}, ${dob}, ${joined}, ${joined}) returning id, name`;
    who[email] = v;
  }
  const events = [
    {
      org: 'Eastside Learning Circle', title: 'Saturday Reading Buddies', location: 'Eastside Branch Library, San José', day: -43, from: [10, 0], to: [12, 0], lagH: 21, code: 'ELRB12', activity: 'education', rating: 5,
      goal: 'Read one-on-one with 12 second graders', outcome: 'Read with 14 kids; 9 finished a chapter book',
      crew: [['ana@example.test', 0, 'general'], ['rhea.castillo@example.test', 2, 'team_lead'], ['bea.lindqvist@example.test', 1, 'general'], ['ines.duarte@example.test', 4, 'general'], ['kofi.mensah@example.test', 3, 'general']],
    },
    {
      org: 'Northside Neighbors Pantry', title: 'Fall Food Drive Sort', location: 'Northside Neighbors Pantry, San José', day: -29, from: [9, 0], to: [12, 30], lagH: 22.5, code: 'NNFD26', activity: 'logistics', rating: 4,
      goal: 'Sort the fall food drive into family boxes', outcome: 'Sorted 900 lbs into 96 family boxes',
      crew: [['ana@example.test', 1, 'team_lead'], ['malik.johnson@example.test', 0, 'event_coordinator'], ['tomas.ferreira@example.test', 2, 'general'], ['kofi.mensah@example.test', 5, 'general'], ['bea.lindqvist@example.test', 3, 'general']],
    },
    {
      org: 'Eastside Learning Circle', title: 'Homework Help Night', location: 'Eastside Branch Library, San José', day: -18, from: [16, 0], to: [18, 0], lagH: 16, code: 'ELHW07', activity: 'education', rating: 5,
      goal: 'Help 15 students finish the week’s homework', outcome: 'Helped 17 students; math and reading',
      crew: [['ana@example.test', 2, 'general'], ['rhea.castillo@example.test', 0, 'team_lead'], ['malik.johnson@example.test', 4, 'general'], ['ines.duarte@example.test', 1, 'general']],
    },
  ];
  for (const e of events) {
    const [o] = await sql`select id from org where name = ${e.org}`;
    const starts = at(e.day, ...e.from);
    const ends = at(e.day, ...e.to);
    const attested = new Date(ends.getTime() + e.lagH * 3_600_000);
    const hours = (ends - starts) / 3_600_000;
    const [ev] = await sql`
      insert into event (org_id, title, location, starts_at, ends_at, checkin_code, status, closed_at, activity, goal_outcome, cohort_rating, attested_at, goal_text, outcome_text)
      values (${o.id}, ${e.title}, ${e.location}, ${starts}, ${ends}, ${e.code}, 'closed', ${attested}, ${e.activity}, 'yes', ${e.rating}, ${attested}, ${e.goal}, ${e.outcome})
      returning id`;
    for (const [email, late, role] of e.crew) {
      const v = who[email];
      const inAt = addMin(starts, late);
      const [a] = await sql`
        insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, checked_out_at, hours_captured, role, status, attested_at)
        values (${ev.id}, ${v.id}, ${v.name}, 'qr', ${inAt}, ${addMin(inAt, hours * 60)}, ${hours}, ${role}, 'attested', ${attested})
        returning id`;
      await sql`insert into record (attendance_id, volunteer_id, org_id, issued_at) values (${a.id}, ${v.id}, ${o.id}, ${attested})`;
    }
  }
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
