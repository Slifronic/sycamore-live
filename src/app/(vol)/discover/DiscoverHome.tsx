'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { criteria, evaluate, modes, rank, weights } from '@/lib/discover/match';
import { causes, groups } from '@/lib/discover/taxonomy';
import type { Mode } from '@/lib/discover/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/media/EmptyState';
import { useDiscover, type Prefs } from './DiscoverState';
import { OpportunityCard, SkillPicker } from './parts';
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

export function DiscoverHome() {
  const d = useDiscover();
  const { prefs, setPrefs, profile, listings, tab, setTab, hidden, saved, reviewed, roles } = d;
  const [showPrefs, setShowPrefs] = useState(false);
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : ({ type: 'spring', stiffness: 380, damping: 34 } as const);
  const presetOn = (p: Partial<Prefs>) => p.mode === prefs.mode && p.cause === prefs.cause;

  const all = useMemo(() => listings.map((o) => evaluate(o, profile)), [listings, profile]);
  const ranked = useMemo(() => rank(listings, profile).filter((r) => !hidden.has(r.opportunity.id)), [listings, profile, hidden]);
  const items = tab === 'all' ? all : tab === 'saved' ? all.filter((r) => saved.has(r.opportunity.id)) : ranked;
  const excluded = all.filter((r) => r.status === 'excluded').length;

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Discover"
        title="Your skills. A cause that matters."
        lede="Upcoming events from organizations on SycaMore, ranked by rules you can read. Change what matters to you and the list re-ranks."
      />

      <div className={s.modes} role="group" aria-label="How to rank">
        {(Object.keys(modes) as Mode[]).map((m) => (
          <button key={m} type="button" className={s.mode} aria-pressed={prefs.mode === m} onClick={() => setPrefs({ mode: m })}>
            {prefs.mode === m && <motion.span layoutId="discover-mode" className={s.modePill} transition={spring} aria-hidden />}
            <strong>{modes[m]}</strong>
            <span>{MODE_HINT[m]}</span>
          </button>
        ))}
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        <span className="small muted">Try a direction:</span>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className={`${s.skillBtn} ${s.preset}`} aria-pressed={presetOn(p.prefs)} onClick={() => setPrefs({ roleArea: 'any', day: 'any', format: 'any', ...p.prefs })}>
            <span className={s.presetTick} aria-hidden>
              ✓
            </span>
            {p.label}
          </button>
        ))}
      </div>

      <button type="button" className={`btn ${s.prefsToggle}`} aria-expanded={showPrefs} aria-controls="discover-prefs" onClick={() => setShowPrefs((v) => !v)}>
        {showPrefs ? 'Hide preferences' : 'Cause, skills and day'}
      </button>

      <div className={s.body}>
        <aside className={`${s.rail} ${showPrefs ? s.railOpen : ''}`} id="discover-prefs">
          <section className="card card-pad stack">
            <span className="eyebrow">Cause, contribution, curiosity</span>
            <h3>Make it meaningful</h3>
            <div className="field">
              <label htmlFor="pref-cause">Cause I care about</label>
              <select id="pref-cause" className="select" value={prefs.cause} onChange={(e) => setPrefs({ cause: e.target.value })}>
                <option value="any">Open to any cause</option>
                {causes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="hint">A preference, not a filter. Other causes stay in the list.</span>
            </div>
            <SkillPicker field="useSkills" label="Skills I want to use" />
            <SkillPicker field="learnSkills" label="Skills I want to develop" />
            <details>
              <summary className={s.textlink}>Area, format and day</summary>
              <div className="stack" style={{ marginTop: 12 }}>
                <div className="field">
                  <label htmlFor="pref-area">Contribution area</label>
                  <select id="pref-area" className="select" value={prefs.roleArea} onChange={(e) => setPrefs({ roleArea: e.target.value })}>
                    <option value="any">Open to any role</option>
                    {Object.entries(groups).map(([k, g]) => (
                      <option key={k} value={k}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pref-format">Where I contribute</label>
                  <select id="pref-format" className="select" value={prefs.format} onChange={(e) => setPrefs({ format: e.target.value as Prefs['format'] })}>
                    <option value="any">Any format</option>
                    <option value="inperson">In person</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pref-day">Day I’m free</label>
                  <select id="pref-day" className="select" value={prefs.day} onChange={(e) => setPrefs({ day: e.target.value })}>
                    <option value="any">Any day</option>
                    {DAYS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  <span className="hint">Format and day are filters: events that don’t match move to Browse all.</span>
                </div>
              </div>
            </details>
            <p className="small muted">Organizations don’t list journey times or travel costs yet, so every event shows that part as unknown instead of a guess.</p>
            <button type="button" className="btn" onClick={d.resetPrefs}>
              Reset preferences
            </button>
          </section>

          <section className="card card-pad stack" style={{ background: 'var(--primary-soft)', boxShadow: 'none' }}>
            <span className="eyebrow">Experience → skills → possibilities</span>
            <h3>{reviewed ? 'Build on a real responsibility' : 'What have you done before?'}</h3>
            {reviewed ? (
              roles.map((r) => (
                <div key={r.id} className="stack" style={{ gap: 6 }}>
                  <strong className="small">{r.title}</strong>
                  <span className="row wrap" style={{ gap: 6 }}>
                    {r.skills.length ? (
                      r.skills.map((sk) => (
                        <button key={sk} type="button" className={s.skillBtn} aria-label={`Find events using ${sk} from ${r.title}`} onClick={() => setPrefs({ useSkills: [sk], mode: 'experience', roleArea: 'any', cause: 'any' })}>
                          {sk} ↗
                        </button>
                      ))
                    ) : (
                      <span className="small muted">No skills selected for this role.</span>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="small muted">Paste role descriptions from your resume or LinkedIn and review which skills you used in each. It stays on this page.</p>
            )}
            <Link className={s.textlink} href="/discover/profile">
              {reviewed ? 'Edit role experience →' : 'Add my role experience →'}
            </Link>
            <p className="small muted">Self-reported experience. Neither a LinkedIn entry nor a tag proves proficiency.</p>
          </section>
        </aside>

        <section className={s.results} aria-labelledby="discover-results">
          <div className="row between wrap" style={{ gap: 10 }}>
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">{prefs.cause === 'any' ? 'Open to possibility' : prefs.cause}</span>
              <h2 id="discover-results">{tab === 'saved' ? 'Saved for later' : tab === 'all' ? 'Every upcoming event' : 'Find a contribution that fits'}</h2>
            </div>
          </div>
          <div className="seg" role="tablist" aria-label="Event lists">
            {(
              [
                ['recommended', 'For you'],
                ['all', 'Browse all'],
                ['saved', `Saved (${[...saved].filter((id) => listings.some((l) => l.id === id)).length})`],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`seg-item ${s.segBtn}`} onClick={() => setTab(k)}>
                {tab === k && <motion.span layoutId="discover-tab" className="seg-pill" transition={spring} aria-hidden />}
                <span className="seg-text">{label}</span>
              </button>
            ))}
          </div>
          <p className="small muted" role="status" aria-live="polite">
            {items.length} {items.length === 1 ? 'event' : 'events'} · {modes[prefs.mode]}
            {prefs.useSkills.length || prefs.learnSkills.length ? ` · use: ${prefs.useSkills.join(', ') || 'open'} · develop: ${prefs.learnSkills.join(', ') || 'open'}` : ''}
          </p>
          {tab === 'recommended' && excluded > 0 && <p className="small muted">{excluded === 1 ? 'One event is' : `${excluded} events are`} outside your format or day. They’re still under Browse all.</p>}
          {tab === 'recommended' && hidden.size > 0 && (
            <button type="button" className={`btn btn-quiet btn-sm ${s.left}`} onClick={d.unhideAll}>
              Show {hidden.size} hidden {hidden.size === 1 ? 'event' : 'events'}
            </button>
          )}
          {items.length ? (
            <div className={s.grid}>
              {/* Re-ranking slides cards to their new places instead of jumping. */}
              <AnimatePresence initial={false} mode="popLayout">
                {items.map((r) => (
                  <motion.div
                    key={r.opportunity.id}
                    layout={reduce ? false : 'position'}
                    initial={reduce ? false : { opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                    transition={spring}
                    className={s.cell}
                  >
                    <OpportunityCard r={r} />
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
                {tab === 'saved' ? 'Tap Save for later on any event. Your list is kept with your account.' : 'Change your day or format, or browse every upcoming event.'}
              </EmptyState>
            </div>
          )}

          <details className={s.how}>
            <summary className={s.textlink}>How these recommendations work</summary>
            <div className="card card-pad stack" style={{ marginTop: 10 }}>
              <p className="small">
                Each event gets fit points from nine rules with fixed weights. They compare the skills and cause the organization tagged on its event with the skills and cause you chose here, and your reviewed role
                history if you add one. Other causes stay in the list; missing information is unknown, not a failing score.
              </p>
              <p className="small muted">
                {criteria.map((c, i) => `${c}: ${weights[prefs.mode][i]}%`).join(' · ')}
              </p>
              <p className="small muted">
                Fit points are an unvalidated, rule-based comparison, not a probability that you’ll be accepted or enjoy it. No prestige, major, badge count or hours total is used. Events come from the organizations’ own
                listings on SycaMore; anything they haven’t listed (journey time, cost, training) is shown as unknown.
              </p>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
