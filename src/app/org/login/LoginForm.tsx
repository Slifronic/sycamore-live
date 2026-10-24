'use client';

import { useActionState } from 'react';
import { signIn } from '../actions';
import s from '../auth.module.css';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="stack">
      <label htmlFor="pin" className="small" style={{ fontWeight: 600 }}>PIN</label>
      <input
        id="pin"
        name="pin"
        className={`input ${s.pin}`}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        pattern="[0-9]{6}"
        autoFocus
        required
      />
      {state?.error && <p className="notice notice-red">{state.error}</p>}
      <button className="btn btn-primary btn-big" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
