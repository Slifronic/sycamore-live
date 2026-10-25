'use client';

import Link from 'next/link';
import { Icon } from '@/components/shell/icons';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Menu } from '@/components/ui/Popover';
import { modes } from '@/lib/discover/match';
import { allSkills, groups } from '@/lib/discover/taxonomy';
import type { Evaluation } from '@/lib/discover/types';
import type { Listing } from '@/lib/discover/listings';
import { Cover } from '@/components/media/Cover';
import { coverFor } from '@/lib/covers';
import { useDiscover, type Prefs } from './DiscoverState';
import s from './discover.module.css';

// Pieces shared by the Discover pages, adapted from the prototype's
// taxonomy-ui.js: status labels, the "why" line, the fit donut and the
// collapsed criterion table. The wording keeps its honest framing: fit points
// are rule-based, not a probability, and unknown details widen the range.

export const listingOf = (r: Evaluation) => r.opportunity as Listing;

/** The listing's cover photo, from its title, tags, cause and kind. */
export const listingCover = (l: Listing) => coverFor({ title: l.title, tags: [...(l.tags ?? []), l.cause ?? '', l.kind ?? ''] });

export const dateLine = (l: Listing) => `${new Date(l.startsAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' })} · ${l.time}`;

export function statusLabel(r: Evaluation) {
  return (
    { excluded: 'Outside your limits', conditional: 'Details to confirm', training: 'Training first', review: 'Review requirements', ready: r.opportunity.level || 'Explore this event' } as const
  )[r.status];
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

/**
 * One plain-language line for a card, or null. Only facts that differ from
 * card to card (a skill you asked to use or learn, a role you described, the
 * cause you picked); the caller also drops a line every card would share.
 */
export function cardReason(r: Evaluation, prefs: Prefs): string | null {
  const o = r.opportunity;
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0]);
  if (r.useMatches.length) return `Uses your ${list(r.useMatches.slice(0, 2))}`;
  if (r.learnMatches.length) return `A chance to practice ${list(r.learnMatches.slice(0, 2))}`;
  if (r.matched.length) return `Builds on ${r.matched[0].skill} from ${r.matched[0].role}`;
  if (prefs.cause !== 'any' && o.cause === prefs.cause) return 'The cause you picked';
  return null;
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
      {on ? 'Saved' : 'Save for later'}
    </button>
  );
}

export function OpportunityCard({ r, reason = null, preload = false }: { r: Evaluation; reason?: string | null; preload?: boolean }) {
  const { tab, hide, saved, toggleSave } = useDiscover();
  const l = listingOf(r);
  const on = saved.has(l.id);
  return (
    <article className={`card hover-lift ${s.card}`}>
      <Link href={`/discover/${l.slug}`} className={s.cardCover} tabIndex={-1} aria-hidden>
        <Cover cover={listingCover(l)} variant="card" preload={preload} />
      </Link>
      <span className="eyebrow">{l.area ? groups[l.area].name : l.kind}</span>
      <h3 className={s.cardTitle}>
        <Link href={`/discover/${l.slug}`} className={s.cardLink}>
          {l.title}
        </Link>
      </h3>
      <p className={s.cardMeta}>
        {l.org} · {dateLine(l)}
      </p>
      {(l.practice?.length || l.cause) && (
        <span className="row wrap" style={{ gap: 6 }}>
          {l.cause && <span className={s.cause}>{l.cause}</span>}
          {l.practice?.slice(0, 3).map((t) => (
            <span key={t} className={s.skill}>
              {t}
            </span>
          ))}
        </span>
      )}
      {reason && (
        <p className={s.reason}>
          <Icon name="check" size={16} className={s.reasonIcon} />
          {reason}
        </p>
      )}
      <div className={s.cardActions}>
        <button type="button" className={`btn btn-sm ${on ? s.savedBtn : ''}`} aria-pressed={on} aria-label={`${on ? 'Unsave' : 'Save'} ${l.title}`} onClick={() => toggleSave(l.id)}>
          <Icon name={on ? 'check' : 'plus'} size={16} /> {on ? 'Saved' : 'Save'}
        </button>
        {tab === 'recommended' && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => hide(l.id)}>
            Not for me
          </button>
        )}
      </div>
    </article>
  );
}

const GROUP_OF: Record<string, string> = Object.fromEntries(Object.values(groups).flatMap((g) => g.skills.map((sk) => [sk, g.name])));

/**
 * Skills as a combobox: type to filter, ↑/↓ to move, Enter to add, Escape to
 * close. Chosen skills sit under it as removable chips.
 */
export function SkillPicker({ field, label }: { field: 'useSkills' | 'learnSkills'; label: string }) {
  const { prefs, setPrefs } = useDiscover();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = prefs[field];
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allSkills.filter((sk) => !list.includes(sk) && (!q || sk.includes(q) || GROUP_OF[sk]?.toLowerCase().includes(q)));
  }, [query, list]);
  const at = Math.min(active, Math.max(0, options.length - 1));

  const add = (sk: string) => {
    if (!list.includes(sk)) setPrefs({ [field]: [...list, sk] });
    setQuery('');
    setActive(0);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const n = options.length;
      if (n) setActive((at + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
    } else if (e.key === 'Enter') {
      if (open && options[at]) {
        e.preventDefault();
        add(options[at]);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation(); // close the list, not the sheet
      setOpen(false);
    }
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={s.combo}>
        <span className={s.comboIcon} aria-hidden>
          <Icon name="search" size={16} />
        </span>
        <input
          ref={input}
          id={id}
          className={`input ${s.comboInput}`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && options[at] ? `${id}-o-${at}` : undefined}
          autoComplete="off"
          placeholder={list.length ? 'Add another skill' : 'Type a skill, e.g. budgeting'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
        />
        {open && (
          <ul id={`${id}-list`} role="listbox" aria-label={label} className={s.comboList}>
            {options.length ? (
              options.map((sk, i) => (
                <li
                  key={sk}
                  id={`${id}-o-${i}`}
                  role="option"
                  aria-selected={i === at}
                  className={s.comboOption}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => add(sk)}
                >
                  <span>{sk}</span>
                  <span className={s.comboGroup}>{GROUP_OF[sk]}</span>
                </li>
              ))
            ) : (
              <li className={s.comboEmpty} role="presentation">
                No skill matches “{query}”.
              </li>
            )}
          </ul>
        )}
      </div>
      {list.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {list.map((sk) => (
            <button
              key={sk}
              type="button"
              className={`${s.skillBtn} ${s.chosen}`}
              aria-label={`Remove ${sk} from ${label.toLowerCase()}`}
              onClick={() => setPrefs({ [field]: list.filter((x) => x !== sk) })}
            >
              {sk}
              <Icon name="x" size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A single choice as a Menu (cause, area, format, day), shown like a field. */
export function ChoiceMenu<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="field">
      <span id={id} className={s.choiceLabel}>
        {label}
      </span>
      <Menu
        label={label}
        placement="bottom-start"
        className={s.choice}
        panelClassName={s.choicePanel}
        trigger={(p) => (
          <button type="button" className={s.choiceBtn} aria-labelledby={`${id} ${id}-v`} {...p}>
            <span id={`${id}-v`} className={s.choiceValue}>
              {current.label}
            </span>
            <Icon name="chevron-down" size={16} />
          </button>
        )}
        items={options.map((o) => ({ label: o.label, onSelect: () => onChange(o.value), current: o.value === value, meta: o.value === value ? <Icon name="check" size={16} /> : undefined }))}
      />
    </div>
  );
}
