'use client';

import { useActionState, useState } from 'react';
import { decideHours } from './actions';
import s from './confirm.module.css';

export function ConfirmForm({ token, hours, contactName, volunteer }: { token: string; hours: number; contactName: string; volunteer: string }) {
  const [state, action, pending] = useActionState(decideHours.bind(null, token), null);
  const [decision, setDecision] = useState<'confirm' | 'decline'>('confirm');

  if (state?.done) {
    return (
      <div className="stack" role="status">
        <h2 className={s.done}>{state.done === 'confirmed' ? 'Confirmed. Thank you.' : 'Declined. Thank you for checking.'}</h2>
        <p className="muted">
          {state.done === 'confirmed'
            ? `The hours now show on ${volunteer}’s transcript with your name and role.`
            : `${volunteer} will see that you declined, with your note if you left one.`}
        </p>
        <p className="small muted">
          Run volunteers yourself? SycaMore records hours from a QR scan at the sign-in table and gives every volunteer a record schools can check.{' '}
          <a href="/org/start">Set up your organization free</a>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="stack">
      <fieldset className={s.choice}>
        <legend>Did they do this?</legend>
        <label>
          <input type="radio" name="decision" value="confirm" checked={decision === 'confirm'} onChange={() => setDecision('confirm')} /> Yes, confirm
        </label>
        <label>
          <input type="radio" name="decision" value="decline" checked={decision === 'decline'} onChange={() => setDecision('decline')} /> No, decline
        </label>
      </fieldset>
      <div className={s.two}>
        <div className="field">
          <label htmlFor="c-name">Your name</label>
          <input id="c-name" name="name" className="input" defaultValue={contactName} required minLength={2} maxLength={80} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="c-role">Your role</label>
          <input id="c-role" name="role" className="input" required={decision === 'confirm'} maxLength={80} placeholder="Volunteer coordinator" autoComplete="organization-title" />
        </div>
      </div>
      {decision === 'confirm' ? (
        <>
          <div className="field">
            <label htmlFor="c-hours">Hours</label>
            <input id="c-hours" name="hours" type="number" className="input" defaultValue={hours} min={0.25} max={12} step={0.25} required inputMode="decimal" />
            <span className="hint">Change it if they served a different amount; they’ll see the number you confirm.</span>
          </div>
          <label className={s.check}>
            <input type="checkbox" name="not_related" required /> I supervised or saw this service, and I’m not related to {volunteer}.
          </label>
        </>
      ) : (
        <div className="field">
          <label htmlFor="c-reason">Note for {volunteer.split(' ')[0]} (optional)</label>
          <textarea id="c-reason" name="reason" className="input" rows={2} maxLength={300} />
        </div>
      )}
      {state?.error && (
        <p className="notice notice-red" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary btn-big" disabled={pending}>
        {pending ? 'Saving…' : decision === 'confirm' ? 'Confirm these hours' : 'Decline'}
      </button>
    </form>
  );
}
