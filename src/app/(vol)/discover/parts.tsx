'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { modes } from '@/lib/discover/match';
import { allSkills, groups } from '@/lib/discover/taxonomy';
import type { Evaluation } from '@/lib/discover/types';
import type { Listing } from '@/lib/discover/listings';
import { useDiscover, type Prefs } from './DiscoverState';
import s from './discover.module.css';

// Pieces shared by the Discover pages, adapted from the prototype's
// taxonomy-ui.js: status labels, the "why" line, the fit donut and the
// collapsed criterion table. The wording keeps its honest framing: fit points
// are rule-based, not a probability, and unknown details widen the range.

export const listingOf = (r: Evaluation) => r.opportunity as Listing;

export const dateLine = (l: Listing) =>
  `${new Date(l.startsAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' })} · ${l.time}`;

export function statusLabel(r: Evaluation) {
  return ({ excluded: 'Outside your limits', conditional: 'Details to confirm', training: 'Training first', review: 'Review requirements', ready: r.opportunity.level || 'Explore this event' } as const)[r.status];
}

export function why(r: Evaluation, prefs: Prefs) {
  const o = r.opportunity;
  const bits: string[] = [];
  if (prefs.cause !== 'any') bits.push(o.cause === prefs.cause ? 'Supports your chosen cause.' : 'A different cause to explore.');
  if (prefs.mode === 'interests') bits.push('Your current interests lead; past experience has no ranking weight.');
  else if (r.useMatches.length) bits.push(`Use ${r.useMatches.join(', ')} in a concrete contribution.`);
  if (r.learnMatches.length) bits.push(`Practice ${r.learnMatches.join(', ')} here.`);
  if (prefs.mode === 'experience' && r.matched.length) bits.push(`Connects with ${r.matched[0].skill} from ${r.matched[0].role}.`);
  return bits.join(' ') || o.outcome;
}

export function briefReasons(r: Evaluation, prefs: Prefs) {
  const out: string[] = [];
  if (prefs.mode === 'interests' && prefs.cause !== 'any' && r.opportunity.cause === prefs.cause) out.push(`Supports ${prefs.cause.toLowerCase()}.`);
  if (prefs.mode === 'experience' && r.matched.length) {
    const m = r.matched.find((x) => prefs.useSkills.includes(x.skill)) || r.matched[0];
    out.push(`Builds on ${m.skill} from ${m.role}.`);
  } else if (r.useMatches.length) out.push(`A chance to use ${r.useMatches.slice(0, 2).join(' and ')}.`);
  if (r.learnMatches.length) out.push(`Practice ${r.learnMatches.slice(0, 2).join(' and ')}.`);
  if (!out.length) out.push(r.opportunity.outcome);
  return out.slice(0, 2);
}

/** Supported points out of 100; 3.6 degrees per point, so 100 fills the ring. */
export function FitDonut({ r, small = false }: { r: Evaluation; small?: boolean }) {
  const v = Math.max(0, Math.min(100, r.low));
  return (
    <div
      className={`${s.donut} ${small ? s.donutSmall : ''}`}
      style={{ '--fit-angle': `${v * 3.6}deg` } as React.CSSProperties}
      role="img"
      aria-label={`${v} out of 100 ${r.knownWeight < 100 ? 'supported fit points so far; some details are unknown' : 'fit points'}`}
    >
      <div className={s.donutCenter}>
        <strong>{v}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

export function FitBreakdown({ r }: { r: Evaluation }) {
  const { prefs } = useDiscover();
  return (
    <details className={s.more}>
      <summary>See why this fits</summary>
      <div className="stack" style={{ gap: 10, marginTop: 10 }}>
        <p className="small muted">{modes[prefs.mode]}. Fit points help compare events; they are rules you can read, not a qualification or a probability.</p>
        {r.knownWeight < 100 && (
          <p className="small muted">
            Supported score: {r.low}. Possible range: {r.low}–{r.high} while some details are unknown.
          </p>
        )}
        <div className={s.tableWrap}>
          <table className="t tight">
            <thead>
              <tr>
                <th scope="col">Factor</th>
                <th scope="col" className="r">
                  Weight
                </th>
                <th scope="col" className="r">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {r.components.map((c) => (
                <tr key={c.name}>
                  <td>
                    <span className={s.factor}>{c.name}</span>
                    <span className="small muted">{c.explanation}</span>
                  </td>
                  <td className="r num">{c.weight}%</td>
                  <td className="r num">{c.weight === 0 ? '0' : c.points === null ? `0–${c.weight}` : Number(c.points.toFixed(1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {r.matched.length > 0 ? (
          <>
            <h3>Your role connection</h3>
            {r.matched.map((m) => (
              <div key={`${m.skill}-${m.role}`} className={s.evidence}>
                <strong>
                  {m.skill} · {m.role}
                </strong>
                <p className="small">“{m.evidence}”</p>
                <span className="small muted">Your reviewed statement, not independently verified</span>
              </div>
            ))}
          </>
        ) : (
          <p className="small muted">Add reviewed role experience to give this recommendation more context.</p>
        )}
        <Link className={s.textlink} href="/discover/profile">
          Review my background →
        </Link>
      </div>
    </details>
  );
}

export function SaveButton({ id, title, wide = false }: { id: string; title: string; wide?: boolean }) {
  const { saved, toggleSave } = useDiscover();
  const on = saved.has(id);
  return (
    <button type="button" className={`btn ${on ? '' : 'btn-primary'} ${wide ? s.wide : ''}`} aria-pressed={on} aria-label={`${on ? 'Unsave' : 'Save'} ${title}`} onClick={() => toggleSave(id)}>
      {on ? '✓ Saved' : 'Save for later'}
    </button>
  );
}

export function OpportunityCard({ r }: { r: Evaluation }) {
  const { prefs, tab, hide } = useDiscover();
  const l = listingOf(r);
  return (
    <article className={`card ${s.card}`}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <span className="eyebrow">{l.area ? groups[l.area].name : l.kind}</span>
        <span className={`chip ${r.status === 'ready' ? 'chip-green' : 'chip-ink'}`}>{statusLabel(r)}</span>
      </div>
      <h3 className={s.cardTitle}>{l.title}</h3>
      <p className="small muted">
        {l.org}
        {l.place && l.place !== l.org ? ` · ${l.place}` : ''}
      </p>
      <p className="small">{dateLine(l)}</p>
      <div className={s.skillLine}>
        <span className="small muted">You could practice</span>
        <span className="row wrap" style={{ gap: 6 }}>
          {l.practice?.length ? l.practice.map((t) => <span key={t} className={s.skill}>{t}</span>) : <span className="small muted">Ask the organizer</span>}
        </span>
      </div>
      {l.cause && <span className={s.cause}>{l.cause}</span>}
      <p className="small">{why(r, prefs)}</p>
      <div className={s.fitLine}>
        <strong>{r.low} fit points</strong>
        <span className="small muted">{r.knownWeight < 100 ? `supported so far · up to ${r.high} once details are known` : 'out of 100'}</span>
      </div>
      <div className="bar" aria-hidden>
        <span style={{ width: `${r.low}%` }} />
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <Link className="btn" href={`/discover/${l.slug}`}>
          See event & fit
        </Link>
        <SaveButton id={l.id} title={l.title} />
        {tab === 'recommended' && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => hide(l.id)}>
            Not for me
          </button>
        )}
      </div>
    </article>
  );
}

export function SkillPicker({ field, label }: { field: 'useSkills' | 'learnSkills'; label: string }) {
  const { prefs, setPrefs } = useDiscover();
  const id = useId();
  const [pick, setPick] = useState(allSkills[0]);
  const list = prefs[field];
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row" style={{ gap: 8 }}>
        <select id={id} className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
          {Object.entries(groups).map(([k, g]) => (
            <optgroup key={k} label={g.name}>
              {g.skills.map((sk) => (
                <option key={sk} value={sk}>
                  {sk}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" className="btn" aria-label={`Add ${pick} to ${label.toLowerCase()}`} onClick={() => !list.includes(pick) && setPrefs({ [field]: [...list, pick] })}>
          Add
        </button>
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        {list.length ? (
          list.map((sk) => (
            <button key={sk} type="button" className={s.skillBtn} aria-label={`Remove ${sk} from ${label.toLowerCase()}`} onClick={() => setPrefs({ [field]: list.filter((x) => x !== sk) })}>
              {sk} ×
            </button>
          ))
        ) : (
          <span className="small muted">Open to suggestions</span>
        )}
      </div>
    </div>
  );
}
