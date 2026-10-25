'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { criteria, evaluate, modes, rank, weights } from '@/lib/discover/match';
import { causes, groups } from '@/lib/discover/taxonomy';
import type { Mode } from '@/lib/discover/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/media/EmptyState';
import { Icon } from '@/components/shell/icons';
import { useDiscover, type Prefs } from './DiscoverState';
import { ChoiceMenu, OpportunityCard, SkillPicker, cardReason } from './parts';
import s from './discover.module.css';

const MODE_HINT: Record<Mode, string> = {
  experience: 'Find a use for what you already know.',
  learn: 'Build skills through hands-on practice.',
  interests: 'Choose a cause, whatever your resume says.',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PRESETS: { label: string; prefs: Partial<Prefs> }[] = [
  { label: 'Budgeting + food access', prefs: { mode: 'experience', cause: 'Food Access & Nutrition', useSkills: ['budgeting'], learnSkills: ['inventory'] } },
  { label: 'Tutoring + education', prefs: { mode: 'learn', cause: 'Education & Youth', useSkills: [], learnSkills: ['tutoring', 'mentoring'] } },
  { label: 'Explore the outdoors', prefs: { mode: 'interests', cause: 'Environment & Conservation', useSkills: [], learnSkills: ['planting'] } },
];

// A lucide-style "sliders" glyph (1.5 stroke), drawn here because the shared
// icon set has no filter icon.
function FilterGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

const FORMATS: { value: Prefs['format']; label: string }[] = [
  { value: 'any', label: 'Any format' },
  { value: 'inperson', label: 'In person' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

// How to rank, cause, skills, area, format and day. It lives in the filter
// sheet on every screen size (a bottom sheet on phones, a side sheet on
// desktop), so the events are the page.
function Preferences() {
  const d = useDiscover();
  const { prefs, setPrefs } = d;
  const id = useId();
  const presetOn = (p: Partial<Prefs>) => p.mode === prefs.mode && p.cause === prefs.cause;
  return (
    <div className={s.prefs}>
      <div className={s.prefGroup} role="radiogroup" aria-labelledby={`${id}-rank`}>
        <span id={`${id}-rank`} className={s.prefLabel}>
          Rank events by
        </span>
        {(Object.keys(modes) as Mode[]).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={prefs.mode === m} className={s.modeRow} onClick={() => setPrefs({ mode: m })}>
            <span className={s.modeDot} aria-hidden />
            <span className={s.modeCopy}>
              <b>{modes[m]}</b>
              <span>{MODE_HINT[m]}</span>
            </span>
          </button>
        ))}
      </div>
      <div className={s.prefGroup}>
        <span className={s.prefLabel}>Quick starts</span>
        <div className="row wrap" style={{ gap: 6 }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`${s.skillBtn} ${s.preset}`}
              aria-pressed={presetOn(p.prefs)}
              onClick={() => setPrefs({ roleArea: 'any', day: 'any', format: 'any', ...p.prefs })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <ChoiceMenu
        label="Cause I care about"
        value={prefs.cause}
        options={[{ value: 'any', label: 'Open to any cause' }, ...causes.map((c) => ({ value: c, label: c }))]}
        onChange={(cause) => setPrefs({ cause })}
      />
      <SkillPicker field="useSkills" label="Skills I want to use" />
      <SkillPicker field="learnSkills" label="Skills I want to develop" />
      <ChoiceMenu
        label="Contribution area"
        value={prefs.roleArea}
        options={[{ value: 'any', label: 'Open to any role' }, ...Object.entries(groups).map(([k, g]) => ({ value: k, label: g.name }))]}
        onChange={(roleArea) => setPrefs({ roleArea })}
      />
      <div className={s.prefGroup}>
        <div className={s.pair}>
          <ChoiceMenu label="Format" value={prefs.format} options={FORMATS} onChange={(format) => setPrefs({ format })} />
          <ChoiceMenu label="Day I’m free" value={prefs.day} options={[{ value: 'any', label: 'Any day' }, ...DAYS.map((x) => ({ value: x, label: x }))]} onChange={(day) => setPrefs({ day })} />
        </div>
        <span className="hint">Format and day filter the list; cause and skills only reorder it.</span>
      </div>
    </div>
  );
}

function RoleHistory() {
  const { reviewed, roles, setPrefs } = useDiscover();
  return (
    <section className={s.roles}>
      <h3 className={s.rolesTitle}>{reviewed ? 'Build on a real responsibility' : 'What have you done before?'}</h3>
      {reviewed ? (
        roles.map((r) => (
          <div key={r.id} className="stack" style={{ gap: 6 }}>
            <strong className="small">{r.title}</strong>
            <span className="row wrap" style={{ gap: 6 }}>
              {r.skills.length ? (
                r.skills.map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    className={s.skillBtn}
                    aria-label={`Find events using ${sk} from ${r.title}`}
                    onClick={() => setPrefs({ useSkills: [sk], mode: 'experience', roleArea: 'any', cause: 'any' })}
                  >
                    {sk}
                  </button>
                ))
              ) : (
                <span className="small muted">No skills selected for this role.</span>
              )}
            </span>
          </div>
        ))
      ) : (
        <p className="small muted">Paste roles from your resume and pick the skills you used. It stays on this page.</p>
      )}
      <Link className={s.textlink} href="/discover/profile">
        {reviewed ? 'Edit role experience' : 'Add my role experience'} <Icon name="arrow-right" size={16} />
      </Link>
    </section>
  );
}

export function DiscoverHome() {
  const d = useDiscover();
  const { prefs, profile, listings, tab, setTab, hidden, saved } = d;
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : ({ type: 'spring', stiffness: 380, damping: 34 } as const);

  const all = useMemo(() => listings.map((o) => evaluate(o, profile)), [listings, profile]);
  const ranked = useMemo(() => rank(listings, profile).filter((r) => !hidden.has(r.opportunity.id)), [listings, profile, hidden]);
  const items = tab === 'all' ? all : tab === 'saved' ? all.filter((r) => saved.has(r.opportunity.id)) : ranked;
  const excluded = all.filter((r) => r.status === 'excluded').length;
  const savedCount = [...saved].filter((id) => listings.some((l) => l.id === id)).length;
  // A card's reason line shows only when it tells cards apart: a line every
  // visible card would share is dropped.
  const reasons = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of items) {
      const why = cardReason(r, prefs);
      if (why) m.set(r.opportunity.id, why);
    }
    const vals = [...m.values()];
    if (items.length > 1 && vals.length === items.length && vals.every((v) => v === vals[0])) m.clear();
    return m;
  }, [items, prefs]);
  const active =
    (prefs.mode !== 'experience' ? 1 : 0) +
    (prefs.cause !== 'any' ? 1 : 0) +
    prefs.useSkills.length +
    prefs.learnSkills.length +
    (prefs.roleArea !== 'any' ? 1 : 0) +
    (prefs.format !== 'any' ? 1 : 0) +
    (prefs.day !== 'any' ? 1 : 0);

  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    if (sheetOpen && !el.open) el.showModal();
    if (!sheetOpen && el.open) el.close();
  }, [sheetOpen]);

  return (
    <div className={s.page}>
      <PageHeader title="Find your next event" className={s.head} />

      <section className={s.results} aria-labelledby="discover-results">
        <h2 id="discover-results" className="sr-only">
          {tab === 'saved' ? 'Saved for later' : tab === 'all' ? 'Every upcoming event' : 'Recommended for you'}
        </h2>
        <div className={s.toolbar}>
          <div className={`seg ${s.seg}`} role="tablist" aria-label="Event lists">
            {(
              [
                ['recommended', 'For you'],
                ['all', 'Browse'],
                ['saved', savedCount ? `Saved ${savedCount}` : 'Saved'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`seg-item ${s.segBtn}`} onClick={() => setTab(k)}>
                {tab === k && <motion.span layoutId="discover-tab" className="seg-pill" transition={spring} aria-hidden />}
                <span className="seg-text">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={s.filterBtn}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label={active ? `Preferences, ${active} set` : 'Preferences'}
            onClick={() => setSheetOpen(true)}
          >
            <FilterGlyph />
            <span className={s.filterText} aria-hidden>
              Preferences
            </span>
            {active > 0 && (
              <span className={s.filterCount} aria-hidden>
                {active}
              </span>
            )}
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {items.length} {items.length === 1 ? 'event' : 'events'}, ranked by {modes[prefs.mode].toLowerCase()}
        </p>
        {tab === 'recommended' && (excluded > 0 || hidden.size > 0) && (
          <p className={s.note}>
            {excluded > 0 && <>{excluded === 1 ? '1 event is' : `${excluded} events are`} outside your format or day; see Browse. </>}
            {hidden.size > 0 && (
              <button type="button" className={s.inlineLink} onClick={d.unhideAll}>
                Show {hidden.size} hidden
              </button>
            )}
          </p>
        )}
        {items.length ? (
          <div className={s.grid}>
            {/* Re-ranking slides cards to their new places instead of jumping. */}
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((r, i) => (
                <motion.div
                  key={r.opportunity.id}
                  layout={reduce ? false : 'position'}
                  initial={reduce ? false : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                  transition={spring}
                  className={s.cell}
                >
                  <OpportunityCard r={r} reason={reasons.get(r.opportunity.id) ?? null} preload={i < 3} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="card">
            <EmptyState
              illo={tab === 'saved' ? 'seed-pod' : 'compass'}
              title={tab === 'saved' ? 'Nothing saved yet.' : 'No events in this view.'}
              action={
                <button type="button" className="btn" onClick={() => setTab('all')}>
                  Browse all events
                </button>
              }
            >
              {tab === 'saved' ? 'Tap Save on any event. Your list is kept with your account.' : 'Change your day or format, or browse every upcoming event.'}
            </EmptyState>
          </div>
        )}

        <details className={s.how}>
          <summary className={s.textlink}>How these recommendations work</summary>
          <div className="card card-pad stack" style={{ marginTop: 10 }}>
            <p className="small">
              Each event gets fit points from nine rules with fixed weights. They compare the skills and cause the organization tagged on its event with the skills and cause you chose here, and your
              reviewed role history if you add one. Other causes stay in the list; missing information is unknown, not a failing score.
            </p>
            <p className="small muted">{criteria.map((c, i) => `${c}: ${weights[prefs.mode][i]}%`).join(' · ')}</p>
            <p className="small muted">
              Fit points are an unvalidated, rule-based comparison, not a probability that you’ll be accepted or enjoy it. No prestige, major, badge count or hours total is used. Events come from the
              organizations’ own listings on SycaMore; anything they haven’t listed (journey time, cost, training) is shown as unknown.
            </p>
          </div>
        </details>
      </section>

      {/* The preferences as a sheet: from the bottom on phones, from the right
          on desktop (a native modal dialog: focus moves in, Escape or a tap
          on the backdrop closes it). */}
      <dialog
        ref={sheet}
        className={s.sheet}
        aria-labelledby="discover-sheet-title"
        onClose={() => setSheetOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSheetOpen(false);
        }}
      >
        {sheetOpen && (
          <div className={s.sheetInner}>
            <div className={s.sheetHead}>
              <h2 id="discover-sheet-title" className={s.sheetTitle}>
                Preferences
              </h2>
              <span className={s.sheetTools}>
                {active > 0 && (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={d.resetPrefs}>
                    Reset
                  </button>
                )}
                <button type="button" className={s.sheetClose} onClick={() => setSheetOpen(false)} aria-label="Close preferences">
                  <Icon name="x" size={20} />
                </button>
              </span>
            </div>
            <Preferences />
            <RoleHistory />
            <div className={s.sheetFoot}>
              <button type="button" className="btn btn-primary btn-big" onClick={() => setSheetOpen(false)}>
                Show {ranked.length} {ranked.length === 1 ? 'event' : 'events'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
