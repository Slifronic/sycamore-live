'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtHours } from '@/lib/hours';
import s from '../pages.module.css';

// A private personal goal. It's a target the volunteer picks, never a claim of
// hours served: only attested hours (passed in from the server) fill the ring.
export function GoalCard({ goal, attested }: { goal: number | null; attested: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pct = goal ? Math.min(100, Math.round((100 * attested) / goal)) : 0;

  const save = async (value: number | null) => {
    setBusy(true);
    setError('');
    const res = await fetch('/api/vol/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hours_goal: value }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setError(data?.error ?? 'No connection. Try again.');
    setEditing(false);
    router.refresh();
  };

  return (
    <section className={`card ${s.goal}`} aria-label="Personal goal">
      <div className={s.goalTop}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Your personal goal</span>
          <h3>{goal ? (attested >= goal ? 'Goal reached.' : 'A little closer.') : 'Set a goal for yourself'}</h3>
          <p className="small muted">
            {goal ? `${fmtHours(attested)} of ${goal} attested hours` : 'Only you see it. Attested hours count toward it.'}
          </p>
        </div>
        {goal && (
          <span className={s.ring} style={{ background: `conic-gradient(var(--sap) ${pct * 3.6}deg, var(--rule-soft) 0)` }} role="img" aria-label={`${pct}% of your goal`}>
            <span>{pct}%</span>
          </span>
        )}
      </div>
      {editing ? (
        <form
          className={s.goalForm}
          onSubmit={(e) => {
            e.preventDefault();
            void save(Number(new FormData(e.currentTarget).get('goal')));
          }}
        >
          <div className="field">
            <label htmlFor="goal-hours">Target hours</label>
            <input id="goal-hours" className="input" name="goal" type="number" inputMode="numeric" min={1} max={2000} step={1} defaultValue={goal ?? 40} required autoFocus />
          </div>
          <button className="btn btn-primary" disabled={busy}>
            Save
          </button>
          {goal && (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => save(null)}>
              Remove
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => setEditing(true)}>
          {goal ? 'Change goal' : 'Set a goal'}
        </button>
      )}
      {error && (
        <p className="notice notice-red small" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
