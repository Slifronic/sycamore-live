'use client';

import { useActionState, useTransition } from 'react';
import { inviteCoordinator, removeMember, revokeInvite, setPinSignIn, signOutEverywhere } from './actions';
import s from './settings.module.css';

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteCoordinator, null);
  return (
    <form action={action} className={s.invite}>
      <label htmlFor="invite-email" className="small" style={{ fontWeight: 600 }}>
        Add a coordinator by email
      </label>
      <div className={s.inviteRow}>
        <input id="invite-email" name="email" type="email" className="input" placeholder="name@yourorg.org" autoComplete="off" required maxLength={200} />
        <button className="btn btn-primary" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
      <span className="hint">They sign in with Google using this email. No PIN to share.</span>
      {state?.error && <p className="notice notice-red">{state.error}</p>}
      {state?.ok && (
        <p className="notice" role="status">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function MemberButton({ accountId, email, label }: { accountId?: string; email?: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm"
      aria-label={label}
      disabled={pending}
      onClick={() => start(() => (accountId ? removeMember(accountId) : revokeInvite(email!)))}
    >
      {pending ? '…' : 'Remove'}
    </button>
  );
}

export function PinSwitch({ on }: { on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`btn ${on ? '' : 'btn-quiet'}`} disabled={pending} onClick={() => start(() => setPinSignIn(!on))}>
      {pending ? 'Saving…' : on ? 'Turn off PIN sign-in' : 'Turn PIN sign-in back on'}
    </button>
  );
}

export function SignOutEverywhere() {
  const [state, action, pending] = useActionState(signOutEverywhere, null);
  return (
    <form action={action} className="stack">
      <button className="btn" data-tone="danger" disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out everywhere else'}
      </button>
      {state?.error && <p className="notice notice-red">{state.error}</p>}
      {state?.ok && (
        <p className="notice" role="status">
          {state.ok}
        </p>
      )}
    </form>
  );
}
