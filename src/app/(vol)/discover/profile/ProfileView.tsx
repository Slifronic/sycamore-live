'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { extractRoles, groups, allSkills } from '@/lib/discover/taxonomy';
import type { Role } from '@/lib/discover/types';
import { PageHeader } from '@/components/PageHeader';
import { useDiscover } from '../DiscoverState';
import s from '../discover.module.css';

// "What did you do? What did you use?" The volunteer pastes role descriptions
// (or opens a .txt/.md file), a small keyword dictionary suggests skills per
// role with the sentence each came from, and nothing counts until they review
// it. All of it lives in this page's memory: no request carries it, nothing
// stores it, and a reload clears it.

const SAMPLE = 'Club Treasurer | Student Association\nBuilt event budgets in Excel, tracked expenses, and compared supply quotes.\n\nEvent Coordinator | Community Club\nOrganized event logistics, volunteer shifts, and outreach communications.';
const MAX_FILE = 200 * 1024;

export function ProfileView() {
  const router = useRouter();
  const { draft, setDraft, setBackground, notify } = useDiscover();
  const [error, setError] = useState('');

  const update = (roles: Role[]) => setDraft({ roles, reviewed: false });
  const edit = (id: string, fn: (r: Role) => Role) => update(draft.roles.map((r) => (r.id === id ? fn(r) : r)));

  return (
    <div className={s.page} style={{ maxWidth: 820 }}>
      <Link href="/discover" className={s.textlink}>
        ← Back to Discover
      </Link>
      <PageHeader eyebrow="Your experience has context" title="What did you do? What did you use?" lede="Connect skills with the roles where you used them. Optional: you can explore without it." />

      <section className="card card-pad stack">
        <span className="eyebrow">01 · Bring your experience</span>
        <h2>Start with a role description</h2>
        <p className="small muted">
          Paste experience from your resume or LinkedIn, one role per paragraph with its title on the first line. It stays in this page’s memory: it isn’t sent to SycaMore’s server or saved anywhere, and it clears when you
          reload. Suggestions come from a small keyword list, not AI.
        </p>
        <div className="field">
          <label htmlFor="background-text">Roles and responsibilities</label>
          <textarea
            id="background-text"
            className="input"
            rows={7}
            value={draft.text}
            onChange={(e) => setDraft({ text: e.target.value })}
            placeholder={'Club Treasurer | Student Association\nPrepared event budgets in Excel and compared supply costs.\n\nEvent Coordinator | Community Club\nOrganized volunteer shifts and outreach.'}
          />
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={() => setDraft({ text: SAMPLE, roles: [], reviewed: false })}>
            Try a sample role history
          </button>
          <label className="btn" style={{ position: 'relative' }}>
            Open a .txt or .md file
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                if (f.size > MAX_FILE) return notify('That file is over 200 KB. Paste the relevant part instead.');
                setDraft({ text: (await f.text()).slice(0, MAX_FILE), roles: [], reviewed: false });
              }}
            />
          </label>
        </div>
        <p className="small muted">PDF and Word files aren’t read; paste the part you want instead. A LinkedIn profile link can’t be imported: copy the experience text from it.</p>
        <button
          type="button"
          className="btn btn-primary btn-big"
          disabled={!draft.text.trim()}
          onClick={() => {
            setDraft({ roles: extractRoles(draft.text), reviewed: false });
            requestAnimationFrame(() => document.getElementById('experience-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            notify('Check the suggested skills before you use them.');
          }}
        >
          Find skills in these roles →
        </button>
      </section>

      <section className="card card-pad stack" id="experience-review">
        <span className="eyebrow">02 · Check each connection</span>
        <h2>Did you use these skills in this role?</h2>
        <p className="small muted">Edit titles, remove wrong suggestions, or add skills you used. These are your statements, not verified credentials.</p>
        {draft.roles.length === 0 && <p className="muted">No roles yet. You can also start without a resume.</p>}
        {draft.roles.map((r) => (
          <RoleReview key={r.id} r={r} onChange={(fn) => edit(r.id, fn)} onRemove={() => update(draft.roles.filter((x) => x.id !== r.id))} />
        ))}
        <button
          type="button"
          className="btn"
          style={{ justifySelf: 'start' }}
          onClick={() => update([...draft.roles, { id: `manual-${Date.now()}`, title: 'My role', description: 'Entered by hand', skills: [], evidence: {} }])}
        >
          Add a role by hand +
        </button>
        <label className="row" style={{ gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
          <input type="checkbox" checked={draft.reviewed} onChange={(e) => setDraft({ reviewed: e.target.checked })} style={{ width: 22, height: 22, flex: 'none' }} />
          I reviewed the role titles and their skill connections.
        </label>
        {error && (
          <p className="notice notice-red small" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary btn-big"
          onClick={() => {
            if (!draft.reviewed) return setError('Review each role and tick the box first.');
            if (draft.roles.some((r) => !r.title.trim())) return setError('Give each role a title, or remove it.');
            setError('');
            setBackground(structuredClone(draft.roles), true);
            notify('Your role experience is in. Tap a skill to find events that use it.');
            router.push('/discover');
          }}
        >
          Use this role experience
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setBackground([], false);
            setDraft({ text: '', roles: [], reviewed: false });
            router.push('/discover');
          }}
        >
          Explore without experience
        </button>
      </section>
    </div>
  );
}

function RoleReview({ r, onChange, onRemove }: { r: Role; onChange: (fn: (r: Role) => Role) => void; onRemove: () => void }) {
  const [pick, setPick] = useState(allSkills[0]);
  return (
    <div className={s.roleReview}>
      <div className="field">
        <label htmlFor={`title-${r.id}`}>Role title</label>
        <input id={`title-${r.id}`} className="input" maxLength={100} value={r.title} onChange={(e) => onChange((x) => ({ ...x, title: e.target.value }))} />
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        {r.skills.length ? (
          r.skills.map((sk) => (
            <button
              key={sk}
              type="button"
              className={s.skillBtn}
              aria-label={`Remove ${sk} from ${r.title}`}
              onClick={() =>
                onChange((x) => {
                  const evidence = { ...x.evidence };
                  delete evidence[sk];
                  return { ...x, skills: x.skills.filter((y) => y !== sk), evidence };
                })
              }
            >
              {sk} ×
            </button>
          ))
        ) : (
          <span className="small muted">No skills selected for this role.</span>
        )}
      </div>
      {r.skills.length > 0 && (
        <details>
          <summary className={s.textlink}>Where these suggestions came from</summary>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {r.skills.map((sk) => (
              <div key={sk} className={s.evidence}>
                <strong className="small">{sk}</strong>
                <p className="small">{r.evidence[sk] || 'Added by you; check it reflects this role.'}</p>
              </div>
            ))}
            <p className="small muted">Keyword suggestions can be wrong. Remove a tag if the text describes something you didn’t do.</p>
          </div>
        </details>
      )}
      <div className="row" style={{ gap: 8 }}>
        <select className="select" aria-label={`Add a skill to ${r.title}`} value={pick} onChange={(e) => setPick(e.target.value)}>
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
        <button
          type="button"
          className="btn"
          onClick={() => onChange((x) => (x.skills.includes(pick) ? x : { ...x, skills: [...x.skills, pick], evidence: { ...x.evidence, [pick]: 'Added by you for this role.' } }))}
        >
          Add skill
        </button>
      </div>
      <button type="button" className="btn btn-quiet btn-sm" style={{ justifySelf: 'start' }} onClick={onRemove}>
        Remove this role
      </button>
    </div>
  );
}
