'use client';

import { useActionState } from 'react';
import { startOrg } from '../actions';

export function StartForm() {
  const [state, action, pending] = useActionState(startOrg, null);
  return (
    <form action={action} className="stack" style={{ gap: 16 }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 8 }}>
        <legend className="small" style={{ fontWeight: 600, marginBottom: 6 }}>We are a</legend>
        <label className="chip chip-ink" style={{ height: 36, padding: '0 14px', cursor: 'pointer' }}>
          <input type="radio" name="kind" value="nonprofit" defaultChecked /> Nonprofit
        </label>
        <label className="chip chip-ink" style={{ height: 36, padding: '0 14px', cursor: 'pointer' }}>
          <input type="radio" name="kind" value="school" /> School or club
        </label>
      </fieldset>
      <div className="field">
        <label htmlFor="name">Organization name</label>
        <input className="input" id="name" name="name" placeholder="e.g. Riverside Restoration Crew" autoComplete="organization" required />
        <span className="hint">Use the legal name. It prints on every record you issue.</span>
      </div>
      <div className="field">
        <label htmlFor="coordinator">Your name</label>
        <input className="input" id="coordinator" name="coordinator" autoComplete="name" required />
      </div>
      <div className="row wrap" style={{ alignItems: 'start' }}>
        <div className="field" style={{ flex: '1 1 200px' }}>
          <label htmlFor="email">Contact email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label htmlFor="phone">Contact phone</label>
          <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" required />
        </div>
      </div>
      <p className="small muted">Schools and scholarship committees call this number if they have a question about an hour record.</p>
      {state?.error && <p className="notice notice-red">{state.error}</p>}
      <button className="btn btn-primary btn-big" disabled={pending}>
        {pending ? 'Setting up…' : 'Create my dashboard'}
      </button>
    </form>
  );
}
