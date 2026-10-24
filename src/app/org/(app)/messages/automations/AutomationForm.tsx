'use client';

import { useActionState, useState } from 'react';
import { runAutomationsAction, saveAutomationAction } from '../actions';
import s from '../messages.module.css';

export function AutomationForm({ id, enabled, body, allowed, due }: { id: string; enabled: boolean; body: string; allowed: string[]; due: number }) {
  const [saved, save, saving] = useActionState(saveAutomationAction, null);
  const [ran, run, running] = useActionState(runAutomationsAction, null);
  const [on, setOn] = useState(enabled);
  const [text, setText] = useState(body);
  const dirty = on !== enabled || text !== body;

  return (
    <form action={save} className="stack" style={{ gap: 10 }}>
      <input type="hidden" name="key" value={id} />
      <label className={s.toggle}>
        <input type="checkbox" name="enabled" checked={on} onChange={(e) => setOn(e.target.checked)} />
        {on ? 'On' : 'Off'}
      </label>
      <div className="field">
        <label htmlFor={`body-${id}`} className="small">
          Message
        </label>
        <textarea id={`body-${id}`} name="body" className="input small" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <span className="hint">
          Fills in per person: {allowed.join(' ')}
        </span>
      </div>
      {(saved?.error || ran?.error) && <p className="notice notice-red small">{saved?.error ?? ran?.error}</p>}
      {(saved?.ok || ran?.ok) && !dirty && (
        <p className="notice notice-green small" role="status">
          {ran?.ok ?? saved?.ok}
        </p>
      )}
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn btn-primary btn-sm" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="submit" formAction={run} className="btn btn-sm" disabled={running || dirty || due === 0} title={dirty ? 'Save first' : undefined}>
          {running ? 'Running…' : due === 0 ? 'Nobody due' : `Run now · ${due} due`}
        </button>
      </div>
    </form>
  );
}
