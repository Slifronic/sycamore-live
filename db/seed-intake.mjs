// Event-intake demo data: tags, places with coordinates, and notes for
// volunteers on the seeded events. Called at the end of seed.mjs.
const PLACES = {
  'Coyote Creek Planting': ['Coyote Creek Trail (Tully Rd entrance)', 'Coyote Creek Trail, San José, CA 95111', 37.3126, -121.8463],
  'Berryessa Creek Planting': ['Berryessa Creek Park', '1500 Calaveras Blvd, Milpitas, CA 95035', 37.4196, -121.8781],
  'Santa Teresa Planting, Phase 1': ['Santa Teresa County Park', '260 Manila Dr, San José, CA 95119', 37.2083, -121.7836],
  'Santa Teresa Planting, Phase 2': ['Santa Teresa County Park', '260 Manila Dr, San José, CA 95119', 37.2083, -121.7836],
  'Pantry Sort Night': ['Westside Community Pantry', '1290 Parkmoor Ave, San José, CA 95126', 37.3163, -121.9126],
  'Guadalupe River Cleanup': ['Guadalupe River Park', 'Guadalupe River Park, San José, CA 95110', 37.331, -121.8963],
  'Earth Day Outreach Table': ['Downtown Farmers Market', 'San Pedro St & Santa Clara St, San José, CA 95113', 37.3361, -121.8935],
};
const TAGS = [
  ['Planting', 'sap'],
  ['Weekend', 'sky'],
  ['Youth-friendly', 'sun'],
  ['Food access', 'clay'],
  ['Outreach', 'plum'],
];
const EVENT_TAGS = {
  planting: ['Planting', 'Weekend', 'Youth-friendly'],
  logistics: ['Food access'],
  outreach: ['Outreach', 'Youth-friendly'],
};
const NOTES = {
  planting: 'Closed-toe shoes, water bottle and sun protection. Gloves and tools provided. Meet at the yellow pop-up tent.',
  logistics: 'Wear closed-toe shoes. Enter through the side door on the parking-lot side.',
  outreach: 'Wear something green. We’ll have flyers, a sign-up tablet and snacks.',
};

export async function seedIntake(sql, orgId) {
  const tagId = {};
  for (const [name, color] of TAGS) {
    const [t] = await sql`insert into tag (org_id, name, color) values (${orgId}, ${name}, ${color}) returning id`;
    tagId[name] = t.id;
  }
  const events = await sql`select id, title, activity from event where org_id = ${orgId} and not is_practice`;
  for (const e of events) {
    const p = PLACES[e.title];
    if (p) {
      await sql`update event set place_name = ${p[0]}, place_address = ${p[1]}, place_lat = ${p[2]}, place_lng = ${p[3]},
                volunteer_notes = ${NOTES[e.activity] ?? null} where id = ${e.id}`;
    }
    for (const name of EVENT_TAGS[e.activity] ?? []) {
      await sql`insert into event_tag (event_id, tag_id) values (${e.id}, ${tagId[name]}) on conflict do nothing`;
    }
  }
}
