import { fmtHours } from '@/lib/hours';
import { MILESTONES, type Transcript } from '@/lib/transcript';
import s from './transcript.module.css';

// The transcript itself: totals, the milestone, a Common App-ready summary per
// organization, and the per-day log with who vouched for each line. Shared by
// the volunteer's own page and the public /t/ page, and prints on one sheet.

const day = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const month = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function TranscriptView({ t }: { t: Transcript }) {
  const pct = t.next_milestone ? Math.min(100, Math.round((100 * t.hours.total) / t.next_milestone.hours)) : 100;
  return (
    <div className={s.wrap}>
      <section className={s.totals} aria-label="Totals">
        <div className={s.total}>
          <span className={s.big}>{fmtHours(t.hours.total)}</span>
          <span className={s.label}>hours of confirmed service</span>
        </div>
        <dl className={s.split}>
          <div>
            <dt>Attested from scans</dt>
            <dd>{fmtHours(t.hours.scanned)} h</dd>
          </div>
          <div>
            <dt>Confirmed by email</dt>
            <dd>{fmtHours(t.hours.email)} h</dd>
          </div>
          <div>
            <dt>Organizations</dt>
            <dd>{t.orgs.length}</dd>
          </div>
          <div>
            <dt>Months active</dt>
            <dd>
              {t.months_active}
              {t.first && t.last && t.first.slice(0, 7) !== t.last.slice(0, 7) && (
                <span className={s.sub}>
                  {month(t.first)} to {month(t.last)}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className={s.milestone} aria-labelledby="ms">
        <div className={s.msHead}>
          <h3 id="ms">{t.milestone ? `${t.milestone.name} milestone` : 'First milestone at 25 hours'}</h3>
          <span className={s.msNote}>SycaMore service milestones (not the President’s Volunteer Service Award)</span>
        </div>
        <ol className={s.msTrack}>
          {MILESTONES.map((m) => (
            <li key={m.hours} data-reached={t.hours.total >= m.hours || undefined}>
              <span className={s.msDot} aria-hidden />
              <span className={s.msName}>{m.name}</span>
              <span className={s.msHours}>{m.hours} h</span>
            </li>
          ))}
        </ol>
        {t.next_milestone && (
          <div className={s.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${t.next_milestone.name}`}>
            <span style={{ width: `${pct}%` }} />
          </div>
        )}
      </section>

      {t.orgs.length > 0 && (
        <section aria-labelledby="by-org">
          <h3 id="by-org" className={s.h3}>
            By organization
          </h3>
          <p className={s.hint}>The numbers application forms ask for: hours per week is the average over the weeks served.</p>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Organization</th>
                  <th scope="col">Hours</th>
                  <th scope="col">Days</th>
                  <th scope="col">Hours / week</th>
                  <th scope="col">Weeks, last 12 months</th>
                  <th scope="col">Dates</th>
                </tr>
              </thead>
              <tbody>
                {t.orgs.map((o) => (
                  <tr key={o.org}>
                    <th scope="row">{o.org}</th>
                    <td>{fmtHours(o.hours)}</td>
                    <td>{o.days}</td>
                    <td>{fmtHours(o.hours_per_week)}</td>
                    <td>{o.weeks_last_year}</td>
                    <td className={s.nowrap}>{o.first === o.last ? day(o.first) : `${month(o.first)} to ${month(o.last)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="log">
        <h3 id="log" className={s.h3}>
          Day by day
        </h3>
        {t.lines.length ? (
          <ol className={s.log}>
            {t.lines.map((l, i) => (
              <li key={`${l.date}-${i}`} className={s.line}>
                <span className={s.date}>{day(l.date)}</span>
                <span className={s.what}>
                  <strong>{l.activity}</strong>
                  <span>
                    {l.org} · {l.role}
                  </span>
                </span>
                <span className={s.hours}>{fmtHours(l.hours)} h</span>
                <span className={s.proof} data-kind={l.evidence}>
                  {l.evidence === 'scanned' ? 'Scanned in and out · attested by the organization' : `Confirmed by email · ${l.attested_by}`}
                  {l.record_code && (
                    <>
                      {' · '}
                      <a href={`/v/${l.record_code}`}>{l.record_code}</a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={s.hint}>Nothing confirmed yet. Hours appear here once an organization verifies an event, or a supervisor confirms a request.</p>
        )}
      </section>
    </div>
  );
}
