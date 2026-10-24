'use client';

import { useActionState } from 'react';
import { signBadge } from '../../actions';

export function SignBadgeForm({ volunteerId, badge, needsNote }: { volunteerId: string; badge: string; needsNote: string | null }) {
  const [state, action, pending] = useActionState(signBadge, null);
  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="volunteer_id" value={volunteerId} />
      <input type="hidden" name="badge" value={badge} />
      {needsNote && <textarea className="input small" name="note" rows={2} placeholder={needsNote} aria-label={needsNote} />}
      {state?.error && <p className="notice notice-red small">{state.error}</p>}
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? 'Signing…' : 'Sign badge'}
      </button>
    </form>
  );
}
