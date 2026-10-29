import 'server-only';
import { sql } from './db';
import { BADGES, addAttendance, badgeByKey, emptyStats, type BadgeDef, type BadgeKey, type VolunteerStats } from './badges';
import { hoursTotal } from './hours';
import { getVolunteer, appUrl, VolError, guardianApproved } from './vol-data';
import { badgeCode, BADGE_CODE } from './codes';
import { isUuid } from './ids';
import type { Activity, Role } from './types';

// The volunteer's side of badges. A badge is earned only when an organization
// signs it (a badge_award row); everything else is progress, computed here from
// the volunteer's attested attendance with that organization, using the rules
// in badges.ts. Pending check-ins and practice events never count.

export type BadgeAward = {
  id: string;
  org: { id: string; name: string; contact_phone: string; contact_email: string };
  evidence_note: string | null;
  signed_by: string;
  signed_at: string;
  code: string | null;
};

export type OrgProgress = {
  org: { id: string; name: string; coordinator_name: string };
  progress: number; // 0..1, the badge's own rule
  targets: { label: string; unit: 'events' | 'hours'; need: number; have: number }[];
};

export type VolBadge = {
  def: Pick<BadgeDef, 'key' | 'name' | 'rule' | 'needsNote'>;
  // signed: an org signed it. ready: meets an org's rule, waiting for sign-off.
  // progress: some attested work counts toward it. locked: nothing yet.
  state: 'signed' | 'ready' | 'progress' | 'locked';
  awards: BadgeAward[]; // newest first
  best: OrgProgress | null; // the organization where the volunteer is furthest along
};

type AttRow = { org_id: string; org_name: string; coordinator_name: string; role: Role; activity: Activity; hours_captured: number; hours_adjusted: number | null };
type AwardRow = {
  id: string; badge: BadgeKey; evidence_note: string | null; signed_by: string; signed_at: Date; code: string | null;
  org_id: string; org_name: string; contact_phone: string; contact_email: string;
};

const toAward = (r: AwardRow): BadgeAward => ({
  id: r.id,
  org: { id: r.org_id, name: r.org_name, contact_phone: r.contact_phone, contact_email: r.contact_email },
  evidence_note: r.evidence_note,
  signed_by: r.signed_by,
  signed_at: new Date(r.signed_at).toISOString(),
  code: r.code,
});

const awardSelect = () => sql`
  select b.id, b.badge, b.evidence_note, b.signed_by, b.signed_at, b.code,
         o.id as org_id, o.name as org_name, o.contact_phone, o.contact_email
  from badge_award b join org o on o.id = b.org_id`;

/** Attested, non-practice stats per organization, the same rollup the org dashboard uses. */
async function statsByOrg(volunteerId: string) {
  const rows = (await sql`
    select e.org_id, o.name as org_name, o.coordinator_name, a.role, e.activity, a.hours_captured, a.hours_adjusted
    from attendance a join event e on e.id = a.event_id join org o on o.id = e.org_id
    where a.volunteer_id = ${volunteerId} and a.status = 'attested' and not e.is_practice`) as unknown as AttRow[];
  const byOrg = new Map<string, { org: OrgProgress['org']; stats: VolunteerStats }>();
  for (const r of rows) {
    if (!byOrg.has(r.org_id)) byOrg.set(r.org_id, { org: { id: r.org_id, name: r.org_name, coordinator_name: r.coordinator_name }, stats: emptyStats() });
    addAttendance(byOrg.get(r.org_id)!.stats, { role: r.role, activity: r.activity, hours: hoursTotal(r) });
  }
  return [...byOrg.values()];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function progressFor(def: BadgeDef, org: OrgProgress['org'], stats: VolunteerStats): OrgProgress {
  return {
    org,
    progress: def.progress(stats),
    targets: def.targets.map((t) => ({ label: t.label, unit: t.unit, need: t.need, have: round2(t.have(stats)) })),
  };
}

export async function volunteerBadges(volunteerId: string): Promise<VolBadge[]> {
  const [orgs, awards] = await Promise.all([
    statsByOrg(volunteerId),
    sql`${awardSelect()} where b.volunteer_id = ${volunteerId} order by b.signed_at desc` as unknown as Promise<AwardRow[]>,
  ]);
  return BADGES.map((def) => {
    const mine = awards.filter((a) => a.badge === def.key).map(toAward);
    const all = orgs.map((o) => progressFor(def, o.org, o.stats)).sort((a, b) => b.progress - a.progress || a.org.name.localeCompare(b.org.name));
    // Once signed somewhere, show progress with an org that hasn't signed it yet (if any).
    const best = all.find((p) => !mine.some((a) => a.org.id === p.org.id)) ?? all[0] ?? null;
    const state: VolBadge['state'] = mine.length ? 'signed' : best && best.progress >= 1 ? 'ready' : best && best.progress > 0 ? 'progress' : 'locked';
    return { def: { key: def.key, name: def.name, rule: def.rule, needsNote: def.needsNote }, state, awards: mine, best };
  });
}

export async function volunteerBadge(volunteerId: string, key: string): Promise<VolBadge | null> {
  if (!(key in badgeByKey)) return null;
  return (await volunteerBadges(volunteerId)).find((b) => b.def.key === key) ?? null;
}

// ---------- public verification link ----------

/** Makes (or returns) the public link for one of the volunteer's signed badges. Never for a minor. */
export async function shareBadge(volunteerId: string, awardId: string): Promise<{ code: string; url: string }> {
  const vol = await getVolunteer(volunteerId);
  if (!vol) throw new VolError('Join first.', 401);
  if (!isUuid(awardId)) throw new VolError('No badge with that id.', 404);
  const [row] = (await sql`select id, volunteer_id, code from badge_award where id = ${awardId}`) as unknown as { id: string; volunteer_id: string; code: string | null }[];
  if (!row) throw new VolError('No badge with that id.', 404);
  if (row.volunteer_id !== volunteerId) throw new VolError('That badge isn’t yours to share.', 403);
  // Checked on the server, so the rule doesn't depend on the button being hidden.
  if (vol.is_minor && !(await guardianApproved(volunteerId))) {
    throw new VolError('Sharing needs a parent or guardian’s OK first. Ask for it on your Transcript page.', 403);
  }

  let code = row.code;
  for (let i = 0; !code && i < 5; i++) {
    try {
      const [u] = (await sql`
        update badge_award set code = ${badgeCode()}, shared_at = now()
        where id = ${row.id} and code is null returning code`) as unknown as { code: string }[];
      code = u?.code ?? ((await sql`select code from badge_award where id = ${row.id}`) as unknown as { code: string | null }[])[0]?.code ?? null;
    } catch (e) {
      if ((e as { code?: string }).code !== '23505') throw e; // unique clash: draw again
    }
  }
  if (!code) throw new VolError('Couldn’t make a link just now. Try again.', 503);
  return { code, url: badgeUrl(code) };
}

export const badgeUrl = (code: string) => `${appUrl()}/v/b/${code}`;

export type PublicBadge = BadgeAward & { volunteer_name: string; def: Pick<BadgeDef, 'key' | 'name' | 'rule'> };

/** Public lookup for /v/b/<code>: only badges the volunteer chose to share have a code. */
export async function badgeByCode(raw: string): Promise<PublicBadge | null> {
  const code = String(raw ?? '').toUpperCase();
  if (!BADGE_CODE.test(code)) return null;
  const [r] = (await sql`
    select b.id, b.badge, b.evidence_note, b.signed_by, b.signed_at, b.code, v.name as volunteer_name,
           o.id as org_id, o.name as org_name, o.contact_phone, o.contact_email
    from badge_award b join org o on o.id = b.org_id join volunteer v on v.id = b.volunteer_id
    where b.code = ${code}`) as unknown as (AwardRow & { volunteer_name: string })[];
  if (!r) return null;
  const def = badgeByKey[r.badge];
  return { ...toAward(r), volunteer_name: r.volunteer_name, def: { key: def.key, name: def.name, rule: def.rule } };
}
