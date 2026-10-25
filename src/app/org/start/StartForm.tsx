'use client';

import { useActionState } from 'react';
import { startOrg } from '../actions';
import s from '../auth.module.css';

export function StartForm() {
  const [state, action, pending] = useActionState(startOrg, null);
  return (
    <form action={action} className="stack" style={{ gap: 16 }}>
      <fieldset className={s.kinds}>
        <legend>We are a</legend>
        <label className={s.kind}>
          <input type="radio" name="kind" value="nonprofit" defaultChecked /> Nonprofit
        </label>
        <label className={s.kind}>
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
          <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" required aria-describedby="phone-hint" />
        </div>
      </div>
      <p id="phone-hint" style={{ marginTop: -8, fontSize: 13, color: 'var(--ink-3)' }}>
        Schools call this number if they have a question about an hour record.
      </p>
      {state?.error && <p className="notice notice-red">{state.error}</p>}
      <button className="btn btn-primary btn-big" disabled={pending}>
        {pending ? 'Setting up…' : 'Set up my organization'}
      </button>
    </form>
  );
}
