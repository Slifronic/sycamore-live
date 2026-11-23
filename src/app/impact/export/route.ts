import { hasImpactAccess } from '@/lib/impact-access';
import { APPLICATION_LABEL, impactReport } from '@/lib/impact';

// CSV downloads for the team: ?what=applications | listings | daily | skills.
// Names are first name and last initial, as on the page. Same key as /impact.

const cell = (v: unknown) => {
  const t = v == null ? '' : String(v);
  // Quote everything; a leading = + - @ is defused so a spreadsheet won't run it.
  return `"${(/^[=+\-@]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`;
};
const csv = (head: string[], rows: unknown[][]) => [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

export async function GET(req: Request) {
  if (!(await hasImpactAccess())) return new Response('Not found', { status: 404 });
  const url = new URL(req.url);
  const what = url.searchParams.get('what') ?? 'applications';
  const r = await impactReport({ includeDemo: url.searchParams.get('demo') === '1' });
  let body: string;
  if (what === 'listings') {
    body = csv(['listing', 'organization', 'skills', 'page views', 'clicks out (all time)', 'applied', 'accepted', 'finished'],
      r.listings.map((l) => [l.title, l.org_name, l.skills.join('; '), l.views, l.outbound, l.applied, l.accepted, l.completed]));
  } else if (what === 'daily') {
    body = csv(['day', 'visits', 'page views', 'sign-ups', 'applications'], r.daily.map((d) => [d.day, d.visitors, d.views, d.signups, d.applications]));
  } else if (what === 'skills') {
    body = csv(['skill', 'source', 'people', 'hours', 'accepted'], [
      ...r.verifiedSkills.map((k) => [k.name, 'verified by organizations', k.people, k.hours, '']),
      ...r.applicationSkills.map((k) => [k.skill, 'self-reported applications', k.people, '', k.accepted]),
    ]);
  } else {
    body = csv(['applied', 'who', 'listing', 'organization', 'skills', 'status', 'via'],
      r.recent.map((a) => [new Date(a.applied_at).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }), a.who, a.title, a.org_name, a.skills.join('; '), APPLICATION_LABEL[a.status], a.via ?? '']));
  }
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="sycamore-${what.replace(/[^a-z]/g, '')}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
