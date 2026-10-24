// Discover demo data: three more made-up organizations with upcoming public
// events, so the volunteer side's Discover page ranks something real. Tag names
// line up with the Discover taxonomy (src/lib/discover/taxonomy.ts): a tag that
// names a skill ("Tutoring") becomes a skill you could practice there, a tag
// that names a cause ("Education & Youth") becomes the event's cause. Nothing
// else about the listing is invented: travel time, cost and support aren't
// stored, so Discover shows them as unknown. Called at the end of seed.mjs,
// after Riverside, and uses no randomness so Riverside's seed is unchanged.

const TZ = 'America/Los_Angeles';
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Days from today (Pacific) to the next `weekday` that is at least `minDays` away.
function daysUntil(weekday, minDays) {
  const todayName = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date());
  const today = DOW.indexOf(todayName);
  let d = minDays;
  while ((today + d) % 7 !== DOW.indexOf(weekday)) d++;
  return d;
}

// A Pacific wall-clock time N days from today, with the right UTC offset for that date.
function at(days, h, m = 0) {
  const d = new Date(Date.now() + days * 86_400_000);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  const noon = new Date(`${ymd}T12:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(noon).find((p) => p.type === 'timeZoneName').value.replace('GMT', '') || '+00:00';
  return new Date(`${ymd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${off}`);
}

const CHECKIN = 'No sign-up needed. Scan the QR code at the sign-in table when you arrive, or type the 6-character code the coordinator shows. No account yet? Ask for the walk-in code: it signs you up and checks you in at once.';

const ORGS = [
  {
    name: 'Eastside Learning Circle', phone: '(408) 555-0187', email: 'dana@eastside-learning.test', coordinator: 'Dana Okafor', pin: '135790', kind: 'nonprofit', city: 'San José, CA',
    tags: [['Tutoring', 'sky'], ['Mentoring', 'plum'], ['Teaching', 'sun'], ['Events', 'stone'], ['Logistics', 'clay'], ['Education & Youth', 'sap']],
    events: [
      { title: 'Homework Help Night', day: ['Wednesday', 2], from: [16, 0], to: [18, 0], code: 'ELCHW3', activity: 'education', tags: ['Tutoring', 'Mentoring', 'Education & Youth'],
        place: ['Mayfair Community Center', '2039 Kammerer Ave, San José, CA 95116', 37.3537, -121.8471],
        goal: 'Help 30 middle schoolers finish their math homework', notes: 'Bring a pencil. Our lead tutor pairs you with a student; the lesson sheets are on the front table.' },
      { title: 'Reading Buddies Saturday', day: ['Saturday', 6], from: [9, 30], to: [11, 30], code: 'ELCRB4', activity: 'education', tags: ['Teaching', 'Tutoring', 'Education & Youth'],
        place: ['Hillview Branch Library', '1600 Hopkins Dr, San José, CA 95122', 37.3388, -121.8296],
        goal: 'Read one-on-one with 20 second graders', notes: 'Meet in the children’s room. Books and a short guide to reading aloud are provided.' },
      { title: 'STEM Fair Setup Crew', day: ['Sunday', 9], from: [8, 0], to: [12, 0], code: 'ELCSF5', activity: 'logistics', tags: ['Events', 'Logistics', 'Education & Youth'],
        place: ['Eastside Learning Circle hall', '1450 Story Rd, San José, CA 95122', 37.3332, -121.8506],
        goal: 'Set up 40 student project tables before doors open', notes: 'Closed-toe shoes. The setup lead has the floor plan at the loading door.' },
    ],
  },
  {
    name: 'Northside Neighbors Pantry', phone: '(408) 555-0119', email: 'luis@northside-pantry.test', coordinator: 'Luis Ortega', pin: '864202', kind: 'nonprofit', city: 'San José, CA',
    tags: [['Distribution', 'clay'], ['Logistics', 'stone'], ['Inventory', 'sun'], ['Budgeting', 'sky'], ['Excel', 'plum'], ['Community', 'sap'], ['Food Access & Nutrition', 'clay'], ['Community Development', 'sap']],
    events: [
      { title: 'Saturday Distribution Shift', day: ['Saturday', 2], from: [8, 0], to: [11, 0], code: 'NNPDS6', activity: 'logistics', tags: ['Distribution', 'Logistics', 'Food Access & Nutrition'],
        place: ['Northside Neighbors Pantry', '488 N 1st St, San José, CA 95112', 37.3456, -121.8952],
        goal: 'Hand out 150 grocery boxes', notes: 'Wear closed-toe shoes. Line up at the side gate; the shift lead gives a five-minute safety briefing.' },
      { title: 'Pantry Inventory & Budget Count', day: ['Thursday', 4], from: [18, 0], to: [20, 0], code: 'NNPIB7', activity: 'logistics', tags: ['Inventory', 'Budgeting', 'Excel', 'Food Access & Nutrition'],
        place: ['Northside Neighbors Pantry', '488 N 1st St, San José, CA 95112', 37.3456, -121.8952],
        goal: 'Count the shelves and update the monthly supply budget', notes: 'Bring a laptop if you have one. The count sheet and last month’s budget are shared at the start.' },
      { title: 'Community Fridge Restock', day: ['Sunday', 3], from: [10, 0], to: [12, 0], code: 'NNPCF8', activity: 'logistics', tags: ['Community', 'Distribution', 'Community Development'],
        place: ['Japantown community fridge', 'N 5th St & Jackson St, San José, CA 95112', 37.3486, -121.8947],
        goal: 'Restock and clean three neighborhood fridges', notes: 'Meet at the pantry van. Gloves and cleaning supplies provided.' },
    ],
  },
  {
    name: 'Bright Street Arts Collective', phone: '(408) 555-0163', email: 'mina@brightstreet-arts.test', coordinator: 'Mina Sato', pin: '975318', kind: 'nonprofit', city: 'San José, CA',
    tags: [['Outreach', 'plum'], ['Design', 'sky'], ['Social media', 'sun'], ['Writing', 'stone'], ['Editing', 'clay'], ['Arts & Culture', 'plum']],
    events: [
      { title: 'Mural Festival Outreach Table', day: ['Saturday', 9], from: [11, 0], to: [15, 0], code: 'BSAMF9', activity: 'outreach', tags: ['Outreach', 'Design', 'Social media', 'Arts & Culture'],
        place: ['SoFA District, S 1st St', 'S 1st St & San Carlos St, San José, CA 95113', 37.3301, -121.8857],
        goal: 'Invite festival visitors to the spring mural workshops', notes: 'Wear something you can get paint on. Flyers and the sign-up tablet are at the booth.' },
      { title: 'Zine Workshop Helpers', day: ['Tuesday', 5], from: [17, 30], to: [19, 30], code: 'BSAZW2', activity: 'education', tags: ['Writing', 'Editing', 'Arts & Culture'],
        place: ['Bright Street studio', '72 N 2nd St, San José, CA 95113', 37.3375, -121.8899],
        goal: 'Help teens write and edit a one-page zine', notes: 'No art experience needed. The workshop lead walks helpers through the plan at 5:15.' },
    ],
  },
];

export async function seedDiscover(sql) {
  let n = 0;
  for (const o of ORGS) {
    const [org] = await sql`
      insert into org (name, contact_phone, contact_email, coordinator_name, coordinator_pin, kind, city, course)
      values (${o.name}, ${o.phone}, ${o.email}, ${o.coordinator}, ${o.pin}, ${o.kind}, ${o.city}, '{}')
      returning id`;
    const tagId = {};
    for (const [name, color] of o.tags) {
      const [t] = await sql`insert into tag (org_id, name, color) values (${org.id}, ${name}, ${color}) returning id`;
      tagId[name] = t.id;
    }
    for (const e of o.events) {
      const days = daysUntil(e.day[0], e.day[1]);
      const [ev] = await sql`
        insert into event (org_id, title, location, starts_at, ends_at, checkin_code, status, activity, goal_text,
                           place_name, place_address, place_lat, place_lng, volunteer_notes)
        values (${org.id}, ${e.title}, ${e.place[0]}, ${at(days, ...e.from)}, ${at(days, ...e.to)}, ${e.code}, 'open', ${e.activity}, ${e.goal},
                ${e.place[0]}, ${e.place[1]}, ${e.place[2]}, ${e.place[3]}, ${`${e.notes}\n\n${CHECKIN}`})
        returning id`;
      for (const t of e.tags) await sql`insert into event_tag (event_id, tag_id) values (${ev.id}, ${tagId[t]})`;
      n++;
    }
  }
  return n;
}
