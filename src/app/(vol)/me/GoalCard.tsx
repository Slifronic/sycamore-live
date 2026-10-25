'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtHours } from '@/lib/hours';
import s from './home.module.css';

// A private personal goal, as one line under the hero number. It's a target
// the volunteer picks, never a claim of hours served: only attested hours
// (passed in from the server) fill the bar.
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

  if (editing)
    return (
      <form
        className={s.goalForm}
        onSubmit={(e) => {
          e.preventDefault();
          void save(Number(new FormData(e.currentTarget).get('goal')));
        }}
      >
        <label htmlFor="goal-hours" className={s.goalLabel}>
          Your goal, in hours
        </label>
        <input id="goal-hours" className="input" name="goal" type="number" inputMode="numeric" min={1} max={2000} step={1} defaultValue={goal ?? 40} required autoFocus />
        <button className="btn btn-primary btn-sm" disabled={busy}>
          Save
        </button>
        {goal && (
          <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => save(null)}>
            Remove
          </button>
        )}
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
        {error && (
          <p className="notice notice-red small" role="alert">
            {error}
          </p>
        )}
      </form>
    );

  if (!goal)
    return (
      <button type="button" className={s.goalSet} onClick={() => setEditing(true)}>
        Set a private goal
      </button>
    );

  return (
    <div className={s.goal}>
      <div className={s.goalBar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Your personal goal">
        <span style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className={s.goalText}>
        {attested >= goal ? 'Goal reached' : `${fmtHours(attested)} of your ${goal} h goal`}
        <button type="button" className={s.goalEdit} onClick={() => setEditing(true)}>
          Edit
        </button>
      </p>
    </div>
  );
}
