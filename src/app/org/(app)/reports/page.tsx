import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { markLesson } from '@/lib/org-data';
import { hoursTotal } from '@/lib/hours';
import { sql } from '@/lib/db';
import { HOUR_RATES, RATE_SOURCE, money, usd, type RateKey } from '@/lib/value';
import { ROLE_LABEL, type Role } from '@/lib/types';
import { fmtDay } from '@/lib/format';
import { PrintButton } from './PrintButton';
import s from './report.module.css';
import { requestNow } from '@/lib/format';

const PERIODS = [
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last 12 months', days: 365 },
  { key: 'all', label: 'All time', days: null },
] as const;

export default async function ReportPage({ searchParams }: PageProps<'/org/reports'>) {
  const org = await requireOrg();
  const sp = await searchParams;
  const period = PERIODS.find((p) => p.key === sp.period) ?? PERIODS[0];
  // California orgs default to the California rate; either can be picked.
  const rk: RateKey = sp.rate === 'us' || sp.rate === 'ca' ? sp.rate : org.city?.includes('CA') ? 'ca' : 'us';
  const hourRate = HOUR_RATES[rk];
  await markLesson(org.id, 'report_opened');
  const ins = await loadOrgInsights(org.id);
  const since = period.days ? new Date(requestNow() - period.days * 86_400_000) : new Date(0);

  const rows = (await sql`
    select a.*, e.title, e.starts_at, e.activity, e.goal_text, e.outcome_text from attendance a join event e on e.id = a.event_id
    where e.org_id = ${org.id} and not e.is_practice and a.status = 'attested' and e.starts_at >= ${since}
  `) as unknown as { volunteer_id: string | null; display_name: string; hours_captured: number; hours_adjusted: number | null; role: Role; title: string; starts_at: Date; event_id: string; standout: boolean; goal_text: string | null; outcome_text: string | null }[];

  const hours = rows.reduce((s, r) => s + hoursTotal(r), 0);
  const people = new Set(rows.map((r) => r.volunteer_id ?? r.display_name.toLowerCase())).size;
  const events = new Map<string, { title: string; date: Date; people: number; hours: number; goal: string | null; outcome: string | null }>();
  for (const r of rows) {
    const e = events.get(r.event_id) ?? { title: r.title, date: r.starts_at, people: 0, hours: 0, goal: r.goal_text, outcome: r.outcome_text };
    e.people += 1;
    e.hours += hoursTotal(r);
    events.set(r.event_id, e);
  }
  const roles = rows.reduce<Record<string, number>>((m, r) => ((m[r.role] = (m[r.role] ?? 0) + 1), m), {});
  const leaders = rows.filter((r) => r.role !== 'general').length;
  const adjusted = rows.filter((r) => r.hours_adjusted != null).length;
  const value = hours * hourRate.usd;
  // First-timers: volunteers whose first verified event with this org falls in the period.
  const inPeriod = new Set(rows.map((r) => r.volunteer_id ?? `name:${r.display_name.trim().toLowerCase()}`));
  const firstTimers = ins.volunteers.filter((v) => inPeriod.has(v.key) && v.first_seen >= since).length;
  const retention = ins.index.parts.find((p) => p.key === 'retention');
  const outcomes = [...events.values()].filter((e) => e.outcome).sort((a, b) => +b.date - +a.date);
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 900 }}>
      <header className="row between wrap no-print">
        <div>
          <h1>Funder report</h1>
          <p className="muted">Everything a grant report asks about your volunteers, from verified data. Pick the period, then save it as a PDF.</p>
        </div>
        <div className="row">
          <a className="btn" href="/api/org/reports/csv">
            Download CSV
          </a>
          <PrintButton />
        </div>
      </header>
      <nav className="row wrap no-print" style={{ gap: 6 }}>
        {PERIODS.map((p) => (
          <Link key={p.key} href={`/org/reports?period=${p.key}&rate=${rk}`} className={`btn btn-sm ${p.key === period.key ? 'btn-primary' : ''}`}>
            {p.label}
          </Link>
        ))}
        <span className="muted small" style={{ marginLeft: 12 }}>Value per hour:</span>
        {(Object.keys(HOUR_RATES) as RateKey[]).map((k) => (
          <Link key={k} href={`/org/reports?period=${period.key}&rate=${k}`} className={`btn btn-sm ${k === rk ? 'btn-primary' : ''}`}>
            {money(HOUR_RATES[k].usd)} {HOUR_RATES[k].label}
          </Link>
        ))}
      </nav>

      <article className={`card ${s.report}`}>
        <header className={s.head}>
          <div>
            <p className={s.eyebrow}>Volunteer impact report</p>
            <h2 className={s.title}>{org.name}</h2>
            <p className="muted small">
              {period.label} · prepared {today} · {org.coordinator_name}, {org.contact_email}, {org.contact_phone}
            </p>
          </div>
          {ins.index.score != null && (
            <div className={s.seal}>
              <span className={s.sealScore}>{ins.index.score}</span>
              <span className="small">SycaMore Index</span>
              <strong className="small" style={{ color: 'var(--gold)' }}>★ {ins.index.tier}</strong>
            </div>
          )}
        </header>

        <section className={s.kpis}>
          <Kpi value={hours.toLocaleString()} label="verified volunteer hours" />
          <Kpi value={people.toLocaleString()} label="volunteers" />
          <Kpi value={String(events.size)} label="events" />
          <Kpi value={usd(value)} label={`value of volunteer time at ${money(hourRate.usd)}/hour (${hourRate.label})`} />
        </section>
        <p className="small">
          {firstTimers.toLocaleString()} {firstTimers === 1 ? 'person' : 'people'} volunteered with us for the first time in this period.
          {retention?.score != null && ` Across all our events, ${retention.detail.charAt(0).toLowerCase()}${retention.detail.slice(1)} (${retention.score}%).`}
        </p>

        {outcomes.length > 0 && (
          <section className={s.section}>
            <h3>What got done</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {outcomes.map((e) => (
                <li key={e.title + e.date}>
                  <strong>{e.title}</strong> ({fmtDay(e.date)}): {e.outcome}
                  {e.goal && <span className="muted"> · goal: {e.goal}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={s.section}>
          <h3>How the hours were recorded</h3>
          <p className="small">
            Volunteers checked in and out at each event by scanning a QR code, and {org.coordinator_name} verified every event when it closed. {rows.length.toLocaleString()} attendances were
            verified;{' '}
            {adjusted === 0
              ? 'none were adjusted by hand.'
              : adjusted === 1
                ? '1 was adjusted by hand, with the reason written on the record.'
                : `${adjusted} were adjusted by hand, each with the reason written on the record.`}{' '}
            Any
            volunteer’s record can be checked at a public link.
          </p>
        </section>

        <section className={s.section}>
          <h3>Events</h3>
          <table className="t">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Volunteers</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {[...events.values()]
                .sort((a, b) => +b.date - +a.date)
                .map((e) => (
                  <tr key={e.title + e.date}>
                    <td>{e.title}</td>
                    <td className="small">{fmtDay(e.date)}</td>
                    <td className="num">{e.people}</td>
                    <td className="num">{e.hours.toLocaleString()}</td>
                  </tr>
                ))}
              {events.size === 0 && (
                <tr>
                  <td colSpan={4} className="muted">No verified events in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className={s.two}>
          <div className={s.section}>
            <h3>Leadership</h3>
            <p className="small">
              {leaders} of {rows.length} attendances were in a leadership role:{' '}
              {(['team_lead', 'event_coordinator', 'program_manager'] as Role[])
                .filter((r) => roles[r])
                .map((r) => `${roles[r]} ${ROLE_LABEL[r].toLowerCase()}`)
                .join(', ') || 'none yet'}
              . {ins.awards.length} skill {ins.awards.length === 1 ? 'badge' : 'badges'} signed.
            </p>
          </div>
          {ins.index.score != null && (
            <div className={s.section}>
              <h3>Program quality (SycaMore Index)</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {ins.index.parts.map((p) => (
                  <li key={p.key}>
                    {p.label}: <strong>{p.score}</strong>. {p.detail}.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <footer className={s.foot}>
          Volunteer time valued at {money(hourRate.usd)} per hour, the {hourRate.label} figure from the {RATE_SOURCE}. This is in-kind value for grant reporting, not revenue. Event completion is the
          coordinator’s own answer at the close of each event. Generated by SycaMore Live.
        </footer>
      </article>
    </div>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className={s.kpi}>{value}</p>
      <p className="small muted">{label}</p>
    </div>
  );
}

export const instant = false;
