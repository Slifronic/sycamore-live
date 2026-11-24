import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { appUrlOr } from '@/lib/app-url';
import { hasImpactAccess, impactConfigured } from '@/lib/impact-access';
import { APPLICATION_LABEL, impactReport, type ImpactReport } from '@/lib/impact';
import { lockImpact, unlockImpact } from './actions';
import { LinkBuilder } from './LinkBuilder';
import s from './impact.module.css';

// The team's impact page: who uses SycaMore, what they apply to, and what
// skills they practice. Behind IMPACT_KEY (lib/impact-access.ts), never
// indexed. Seed and demo accounts are left out unless ?demo=1.

export const metadata: Metadata = { title: 'Impact', robots: { index: false, follow: false } };

const fmt = (n: number) => n.toLocaleString('en-US');
const pl = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;
/** A timestamp's day in Pacific time, as YYYY-MM-DD. */
const pacificDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const short = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function Gate({ error }: { error?: string }) {
  if (!impactConfigured()) {
    return (
      <main className={s.gate}>
        <h1>Impact</h1>
        <p>This page is off until <code>IMPACT_KEY</code> is set in the project’s environment variables.</p>
      </main>
    );
  }
  return (
    <main className={s.gate}>
      <h1>Impact</h1>
      <p>For the SycaMore team. Enter the team key.</p>
      <form action={unlockImpact} className={s.gateForm}>
        <input className="input" type="password" name="key" autoComplete="current-password" aria-label="Team key" required />
        <button className="btn btn-primary">Open</button>
      </form>
      {error === 'key' && <p className={s.err}>That key didn’t match.</p>}
      {error === 'wait' && <p className={s.err}>Too many tries. Wait 15 minutes.</p>}
    </main>
  );
}

/** One series per strip: a bar per day, its value on hover. */
function Strip({ label, total, values, days }: { label: string; total: number; values: number[]; days: string[] }) {
  const max = Math.max(1, ...values);
  const W = 600;
  const H = 64;
  const step = W / values.length;
  const bw = Math.max(2, step - 2);
  return (
    <figure className={s.strip}>
      <figcaption>
        <span>{label}</span>
        <b>{fmt(total)}</b>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${label} per day, last 30 days: ${fmt(total)} in all`}>
        <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} className={s.base} />
        {values.map((v, i) => {
          const h = v === 0 ? 0 : Math.max(3, (v / max) * (H - 4));
          return (
            <g key={days[i]}>
              <rect x={i * step} y={0} width={step} height={H} className={s.hit}>
                <title>{`${short(days[i]!)}: ${fmt(v)}`}</title>
              </rect>
              {h > 0 && <rect x={i * step + 1} y={H - h} width={bw} height={h} rx={Math.min(3, bw / 2)} className={s.bar} pointerEvents="none" />}
            </g>
          );
        })}
      </svg>
      <div className={s.axis}>
        <span>{short(days[0]!)}</span>
        <span>{short(days.at(-1)!)}</span>
      </div>
    </figure>
  );
}

/** Sentences the team can put in an application, each with where its number comes from. */
function claims(r: ImpactReport): { text: string; source: string }[] {
  const t = r.totals;
  const out: { text: string; source: string }[] = [];
  if (t.volunteers) out.push({ text: `${t.volunteers === 1 ? '1 person has' : `${fmt(t.volunteers)} people have`} created SycaMore volunteer accounts${t.volunteers30 ? ` (${fmt(t.volunteers30)} in the last 30 days)` : ''}.`, source: 'Accounts in the database' });
  if (t.applicants)
    out.push({
      text: `${fmt(t.applicants)} ${t.applicants === 1 ? 'person has' : 'people have'} used SycaMore to apply to ${fmt(t.applications)} volunteer ${t.applications === 1 ? 'role' : 'roles'}${t.accepted ? `; ${t.accepted === 1 ? '1 was' : `${fmt(t.accepted)} were`} accepted` : ''}.`,
      source: 'Self-reported by volunteers (“I applied”)',
    });
  if (t.verifiedHours) out.push({ text: `Organizations have verified ${pl(t.verifiedHours, 'volunteer hour', 'volunteer hours')} for ${pl(t.verifiedPeople, 'person', 'people')} across ${pl(t.verifiedEvents, 'event', 'events')} on SycaMore.`, source: 'Organization-attested records' });
  const topSkills = r.verifiedSkills.slice(0, 3).map((k) => k.name.toLowerCase());
  if (topSkills.length) out.push({ text: `The most-practiced skill areas in verified hours are ${topSkills.join(', ')}.`, source: 'Organization-attested records' });
  if (t.visits30) out.push({ text: `${pl(t.visits30, 'visit', 'visits')} in the last 30 days.`, source: 'Visit counter (a person counts once a day)' });
  return out;
}

export default async function ImpactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  if (!(await hasImpactAccess())) return <Gate error={typeof sp.e === 'string' ? sp.e : undefined} />;
  const includeDemo = sp.demo === '1';
  const r = await impactReport({ includeDemo });
  const t = r.totals;
  const days = r.daily.map((d) => d.day);
  const active = r.listings.filter((l) => l.views || l.outbound || l.applied);
  const q = includeDemo ? '&demo=1' : '';

  return (
    <main className={s.page}>
      <header className={s.head}>
        <div>
          <p className={s.eyebrow}>SycaMore team</p>
          <h1>Impact</h1>
          <p className={s.sub}>
            Who uses SycaMore and what they build with it. {includeDemo ? 'Including seed and demo accounts.' : 'Seed and demo accounts are left out.'}
          </p>
        </div>
        <div className={s.headActions}>
          <Link className="btn btn-sm" href="/our-impact">
            Public page
          </Link>
          <Link className="btn btn-sm" href={includeDemo ? '/impact' : '/impact?demo=1'}>
            {includeDemo ? 'Hide demo data' : 'Show demo data'}
          </Link>
          <form action={lockImpact}>
            <button className="btn btn-sm btn-quiet">Lock</button>
          </form>
        </div>
      </header>

      <section className={s.tiles} aria-label="Totals">
        <div className={s.tile}>
          <span>Visits, 7 days</span>
          <b>{fmt(t.visits7)}</b>
          <small>{fmt(t.visits30)} in 30 days</small>
        </div>
        <div className={s.tile}>
          <span>Volunteer accounts</span>
          <b>{fmt(t.volunteers)}</b>
          <small>+{fmt(t.volunteers30)} in 30 days</small>
        </div>
        <div className={s.tile}>
          <span>Applied through SycaMore</span>
          <b>{fmt(t.applicants)}</b>
          <small>
            {pl(t.applications, 'application', 'applications')} · {fmt(t.accepted)} accepted
          </small>
        </div>
        <div className={s.tile}>
          <span>Verified hours</span>
          <b>{fmt(t.verifiedHours)}</b>
          <small>
            {pl(t.verifiedPeople, 'person', 'people')} · {pl(t.orgs, 'organization', 'organizations')}
          </small>
        </div>
        <div className={s.tile}>
          <span>Clicks to listings</span>
          <b>{fmt(t.outbound)}</b>
          <small>all time</small>
        </div>
      </section>

      <section className={`card ${s.card}`}>
        <h2>Last 30 days</h2>
        <div className={s.strips}>
          <Strip label="Visits" total={r.daily.reduce((n, d) => n + d.visitors, 0)} values={r.daily.map((d) => d.visitors)} days={days} />
          <Strip label="Sign-ups" total={r.daily.reduce((n, d) => n + d.signups, 0)} values={r.daily.map((d) => d.signups)} days={days} />
          <Strip label="Applications" total={r.daily.reduce((n, d) => n + d.applications, 0)} values={r.daily.map((d) => d.applications)} days={days} />
        </div>
        <p className={s.fine}>
          Hover a day for its number. <a href={`/impact/export?what=daily${q}`}>Download CSV</a>
        </p>
      </section>

      <section className={`card ${s.card}`}>
        <h2>What we can say</h2>
        {claims(r).length ? (
          <ul className={s.claims}>
            {claims(r).map((c) => (
              <li key={c.text}>
                <p>{c.text}</p>
                <small>{c.source}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>Nothing to say yet: no accounts, applications or verified hours.</p>
        )}
        <p className={s.fine}>Keep “applied” and “verified” apart when you write it up: only organization-attested hours are verified.</p>
      </section>

      <div className={s.two}>
        <section className={`card ${s.card}`}>
          <h2>Skills practiced</h2>
          <p className={s.cap}>Verified hours, by the skill area of the role and activity the organization confirmed.</p>
          {r.verifiedSkills.length ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Skill area</th>
                  <th className={s.num}>People</th>
                  <th className={s.num}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {r.verifiedSkills.map((k) => (
                  <tr key={k.key}>
                    <td>{k.name}</td>
                    <td className={s.num}>{fmt(k.people)}</td>
                    <td className={s.num}>{fmt(k.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.empty}>No verified hours yet.</p>
          )}
        </section>
        <section className={`card ${s.card}`}>
          <h2>Skills people applied to use</h2>
          <p className={s.cap}>From the listings volunteers marked “I applied”. Self-reported.</p>
          {r.applicationSkills.length ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th className={s.num}>People</th>
                  <th className={s.num}>Accepted</th>
                </tr>
              </thead>
              <tbody>
                {r.applicationSkills.map((k) => (
                  <tr key={k.skill}>
                    <td>{k.skill}</td>
                    <td className={s.num}>{fmt(k.people)}</td>
                    <td className={s.num}>{fmt(k.accepted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.empty}>No applications yet.</p>
          )}
          <p className={s.fine}>
            <a href={`/impact/export?what=skills${q}`}>Download skills CSV</a>
          </p>
        </section>
      </div>

      <section className={`card ${s.card}`}>
        <h2>Share links that count</h2>
        <p className={s.cap}>Send friends a tagged link. Visits, sign-ups and applications that come through it show up below under the tag for 30 days.</p>
        <LinkBuilder base={appUrlOr('https://sycamore-live.vercel.app')} listings={r.listings.map((l) => ({ slug: l.slug, label: `${l.org_name}: ${l.title}` }))} />
        {r.via.length > 0 && (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Tag</th>
                <th className={s.num}>Visits</th>
                <th className={s.num}>Sign-ups</th>
                <th className={s.num}>Applications</th>
              </tr>
            </thead>
            <tbody>
              {r.via.map((v) => (
                <tr key={v.via}>
                  <td>
                    <code>{v.via}</code>
                  </td>
                  <td className={s.num}>{fmt(v.visitors)}</td>
                  <td className={s.num}>{fmt(v.signups)}</td>
                  <td className={s.num}>{fmt(v.applications)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`card ${s.card}`}>
        <h2>Recent applications</h2>
        {r.recent.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Who</th>
                <th>Listing</th>
                <th>Status</th>
                <th>Tag</th>
                <th className={s.num}>Applied</th>
              </tr>
            </thead>
            <tbody>
              {r.recent.slice(0, 25).map((a) => (
                <tr key={a.id}>
                  <td>{a.who}</td>
                  <td>
                    <Link href={`/opportunities/${a.slug}`}>{a.org_name}</Link>
                    <small className={s.dim}> {a.title}</small>
                  </td>
                  <td>
                    <span className={`chip ${a.status === 'accepted' || a.status === 'completed' ? 'chip-green' : 'chip-ink'}`}>{APPLICATION_LABEL[a.status]}</span>
                  </td>
                  <td>{a.via ? <code>{a.via}</code> : <span className={s.dim}>none</span>}</td>
                  <td className={s.num}>{short(pacificDay(a.applied_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={s.empty}>No one has marked “I applied” yet. Volunteers see the button under “Go to their page” on every listing once they’re signed in.</p>
        )}
        <p className={s.fine}>
          <a href={`/impact/export?what=applications${q}`}>Download applications CSV</a>
        </p>
      </section>

      <div className={s.two}>
        <section className={`card ${s.card}`}>
          <h2>Listings</h2>
          <p className={s.cap}>Every public listing with a view, a click out or an application.</p>
          {active.length ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th className={s.num}>Views</th>
                  <th className={s.num}>Clicks</th>
                  <th className={s.num}>Applied</th>
                </tr>
              </thead>
              <tbody>
                {active.map((l) => (
                  <tr key={l.slug}>
                    <td>
                      <Link href={`/opportunities/${l.slug}`}>{l.org_name}</Link>
                    </td>
                    <td className={s.num}>{fmt(l.views)}</td>
                    <td className={s.num}>{fmt(l.outbound)}</td>
                    <td className={s.num}>{fmt(l.applied)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.empty}>No activity on listings yet.</p>
          )}
          <p className={s.fine}>
            <a href={`/impact/export?what=listings${q}`}>Download all listings CSV</a>
          </p>
        </section>
        <section className={`card ${s.card}`}>
          <h2>Top pages, 30 days</h2>
          {r.pages.length ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Page</th>
                  <th className={s.num}>Views</th>
                  <th className={s.num}>Landed here</th>
                </tr>
              </thead>
              <tbody>
                {r.pages.map((p) => (
                  <tr key={p.path}>
                    <td>
                      <code>{p.path}</code>
                    </td>
                    <td className={s.num}>{fmt(p.views)}</td>
                    <td className={s.num}>{fmt(p.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.empty}>No visits counted yet.</p>
          )}
          {r.signupMethods.length > 0 && (
            <p className={s.fine}>
              Sign-ups by way in: {r.signupMethods.map((m) => `${m.method.replace(/_/g, ' ')} ${fmt(m.n)}`).join(' · ')}
            </p>
          )}
        </section>
      </div>

      <p className={s.foot}>
        Visits are counted without cookies: a hash of a daily random salt, the address and the browser, so a person counts once a day and can’t be followed across days.
        Browsers that send Global Privacy Control or Do Not Track aren’t counted.
      </p>
    </main>
  );
}

export const instant = false;
