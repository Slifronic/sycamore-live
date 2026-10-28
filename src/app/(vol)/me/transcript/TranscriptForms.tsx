'use client';

import { useActionState, useState, useTransition } from 'react';
import { askGuardian, publish, requestHours, resendRequest, unpublish, type TxState } from './actions';
import s from './page.module.css';

function Notice({ state }: { state: TxState }) {
  if (state?.error) return <p className="notice notice-red" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="notice" role="status">{state.ok}</p>;
  return null;
}

export function PublishControls({ url, linkedIn }: { url: string | null; linkedIn: string | null }) {
  const [state, setState] = useState<TxState>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  if (!url) {
    return (
      <div className="stack">
        <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => setState(await publish()))}>
          {pending ? 'Making your link…' : 'Make a public link'}
        </button>
        <Notice state={state} />
      </div>
    );
  }
  return (
    <div className="stack">
      <div className={s.linkRow}>
        <input className="input" readOnly value={url} aria-label="Your transcript link" onFocus={(e) => e.currentTarget.select()} />
        <button
          className="btn"
          onClick={async () => {
            await navigator.clipboard?.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">
          Open
        </a>
        {linkedIn && (
          <a className="btn btn-sm" href={linkedIn} target="_blank" rel="noreferrer">
            Add to LinkedIn
          </a>
        )}
        <button className="btn btn-quiet btn-sm" disabled={pending} onClick={() => start(async () => setState(await unpublish()))}>
          Turn the link off
        </button>
      </div>
      <Notice state={state} />
    </div>
  );
}

export function GuardianForm({ email, pending: waiting }: { email: string | null; pending: boolean }) {
  const [state, action, pending] = useActionState(askGuardian, null);
  return (
    <form action={action} className="stack">
      {waiting && !state && (
        <p className="notice" role="status">
          Waiting for {email ?? 'your parent or guardian'} to approve. The link in their email works for 14 days.
        </p>
      )}
      <div className="field">
        <label htmlFor="guardian-email">Parent or guardian’s email</label>
        <input id="guardian-email" name="email" type="email" className="input" defaultValue={email ?? ''} required maxLength={200} autoComplete="off" />
        <span className="hint">They get one email with a link to approve or say no. Nothing is shared until they approve.</span>
      </div>
      <button className="btn" disabled={pending}>
        {pending ? 'Sending…' : waiting ? 'Send it again' : 'Ask them to approve'}
      </button>
      <Notice state={state} />
    </form>
  );
}

export function HourRequestForm() {
  const [state, action, pending] = useActionState(requestHours, null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className={s.form}>
      <div className="field">
        <label htmlFor="hr-org">Organization</label>
        <input id="hr-org" name="org_name" className="input" required minLength={2} maxLength={120} placeholder="e.g. Second Harvest Food Bank" />
      </div>
      <div className={s.two}>
        <div className="field">
          <label htmlFor="hr-contact">Supervisor’s name</label>
          <input id="hr-contact" name="contact_name" className="input" required minLength={2} maxLength={80} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="hr-email">Supervisor’s work email</label>
          <input id="hr-email" name="contact_email" type="email" className="input" required maxLength={200} autoComplete="off" />
        </div>
      </div>
      <div className={s.two}>
        <div className="field">
          <label htmlFor="hr-date">Date</label>
          <input id="hr-date" name="served_on" type="date" className="input" required max={today} />
        </div>
        <div className="field">
          <label htmlFor="hr-hours">Hours</label>
          <input id="hr-hours" name="hours" type="number" className="input" required min={0.25} max={12} step={0.25} inputMode="decimal" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="hr-desc">What you did</label>
        <textarea id="hr-desc" name="description" className="input" required minLength={10} maxLength={500} rows={3} placeholder="Sorted donations and packed 60 grocery boxes" />
        <span className="hint">Your supervisor sees exactly this. Not a parent or relative: schools don’t accept that.</span>
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Sending…' : 'Send for confirmation'}
      </button>
      <Notice state={state} />
    </form>
  );
}

export function ResendButton({ id }: { id: string }) {
  const [state, setState] = useState<TxState>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn btn-quiet btn-sm" disabled={pending || !!state?.ok} onClick={() => start(async () => setState(await resendRequest(id)))}>
        {state?.ok ? 'Reminder sent' : pending ? 'Sending…' : 'Send a reminder'}
      </button>
      {state?.error && <span className="small" style={{ color: 'var(--red, #b42318)' }}>{state.error}</span>}
    </>
  );
}
