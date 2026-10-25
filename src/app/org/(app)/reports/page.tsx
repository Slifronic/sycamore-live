import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { markLesson } from '@/lib/org-data';
import { hoursTotal } from '@/lib/hours';
import { sql } from '@/lib/db';
import { HOUR_RATES, RATE_SOURCE, money, usd, type RateKey } from '@/lib/value';
import { ROLE_LABEL, type Role } from '@/lib/types';
import { fmtDay } from '@/lib/format';
import { PrintButton } from './PrintButton';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import s from './report.module.css';
import { requestNow } from '@/lib/format';

export const metadata = { title: 'Funder report' };

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
  // Observed timing, no score: verified events in this period signed off within a day of ending.
  const periodVerified = ins.verified.filter((e) => events.has(e.id));
  const within24h = periodVerified.filter((e) => new Date(e.attested_at!).getTime() - new Date(e.ends_at).getTime() <= 24 * 3_600_000).length;
  const outcomes = [...events.values()].filter((e) => e.outcome).sort((a, b) => +b.date - +a.date);
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="page">
      <PageHeader
        className="no-print"
        eyebrow={<span className="eyebrow-sap">Proof · {period.label.toLowerCase()}</span>}
        title="Funder report"
        lede="Everything a grant report asks about your volunteers, from verified data. Pick the period, then save it as a PDF."
      />

      <div className={s.layout}>
      <article className={`paper-sheet ${s.report}`}>
        <header className={s.head}>
          <div>
            <p className="eyebrow eyebrow-sap">Volunteer impact report</p>
            <h2 className={s.title}>{org.name}</h2>
            <p className="muted small">
              {period.label} · prepared {today} · {org.coordinator_name}, {org.contact_email}, {org.contact_phone}
            </p>
          </div>
          {periodVerified.length > 0 && (
            <div className={s.seal}>
              <span className={s.sealScore}>
                {within24h} of {periodVerified.length}
              </span>
              <span className="small" style={{ textAlign: 'center' }}>
                events verified within
                <br />
                24 hours of ending
              </span>
            </div>
          )}
        </header>

        <section className={s.kpis}>
          <Kpi eyebrow="Verified hours" value={hours.toLocaleString()} label={`${rows.length.toLocaleString()} attendances`} />
          <Kpi eyebrow="Volunteers" value={people.toLocaleString()} label={`${firstTimers.toLocaleString()} new this period`} />
          <Kpi eyebrow="Events" value={String(events.size)} label="each verified at close" />
          <Kpi eyebrow="Value of time" value={usd(value)} label={`at ${money(hourRate.usd)}/hour (${hourRate.label})`} />
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
                <th scope="col">Event</th>
                <th scope="col">Date</th>
                <th scope="col" className="r">Volunteers</th>
                <th scope="col" className="r">Hours</th>
              </tr>
            </thead>
            <tbody>
              {[...events.values()]
                .sort((a, b) => +b.date - +a.date)
                .map((e) => (
                  <tr key={e.title + e.date}>
                    <td style={{ fontWeight: 600 }}>{e.title}</td>
                    <td className="small">{fmtDay(e.date)}</td>
                    <td className="num r">{e.people}</td>
                    <td className="num r">{e.hours.toLocaleString()}</td>
                  </tr>
                ))}
              {events.size > 1 && (
                <tr className={s.total}>
                  <td colSpan={2}>Total</td>
                  <td className="num r">{rows.length.toLocaleString()}</td>
                  <td className="num r">{hours.toLocaleString()}</td>
                </tr>
              )}
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
              . {ins.awards.length} {ins.awards.length === 1 ? 'badge' : 'badges'} signed by a coordinator.
            </p>
          </div>
          {periodVerified.length > 0 && (
            <div className={s.section}>
              <h3>Record-keeping</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  {within24h} of {periodVerified.length} events were verified within 24 hours of ending.
                </li>
                <li>{adjusted === 0 ? 'No hours were changed by hand.' : `${adjusted} of ${rows.length} attendances were changed by hand, each with a written reason.`}</li>
              </ul>
            </div>
          )}
        </section>

        <footer className={s.foot}>
          Volunteer time valued at {money(hourRate.usd)} per hour, the {hourRate.label} figure from the {RATE_SOURCE}. This is in-kind value for grant reporting, not revenue.
          {outcomes.length > 0 ? ' “What got done” is the coordinator’s own account, written when each event closed.' : ''} Generated by SycaMore Live.
        </footer>
      </article>

      <aside className={`${s.rail} no-print`}>
        <div className="stack" style={{ gap: 8 }}>
          <p className="eyebrow">Period</p>
          <Segmented id="period" label="Report period" vertical items={PERIODS.map((p) => ({ href: `/org/reports?period=${p.key}&rate=${rk}`, label: p.label, on: p.key === period.key }))} />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <p className="eyebrow">Value per hour</p>
          <Segmented
            id="rate"
            label="Value per volunteer hour"
            vertical
            items={(Object.keys(HOUR_RATES) as RateKey[]).map((k) => ({ href: `/org/reports?period=${period.key}&rate=${k}`, label: `${money(HOUR_RATES[k].usd)} ${HOUR_RATES[k].label}`, on: k === rk }))}
          />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <PrintButton />
          <a className="btn" href="/api/org/reports/csv">
            Download CSV
          </a>
        </div>
        <p className="small muted">Each volunteer’s hours can be checked by anyone at a public link, so a funder never has to take this sheet on trust.</p>
      </aside>
      </div>
    </div>
  );
}

function Kpi({ eyebrow, value, label }: { eyebrow: string; value: string; label: string }) {
  return (
    <div className={s.kpiBox}>
      <p className="eyebrow">{eyebrow}</p>
      <p className={s.kpi}>{value}</p>
      <p className="small muted">{label}</p>
    </div>
  );
}

export const instant = false;
