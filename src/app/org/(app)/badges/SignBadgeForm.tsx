'use client';

import { useActionState, useEffect } from 'react';
import { signBadge } from '../../actions';
import { toast } from '@/components/shell/Toast';

export function SignBadgeForm({ volunteerId, badge, badgeName, volunteerName, needsNote }: { volunteerId: string; badge: string; badgeName: string; volunteerName: string; needsNote: string | null }) {
  const [state, action, pending] = useActionState(signBadge, null);
  // The card leaves the list once signed (the page revalidates), so the toast is the confirmation.
  useEffect(() => {
    if (state?.ok) toast.success(`${badgeName} signed`, { body: `${volunteerName} can see it on their record now.` });
  }, [state, badgeName, volunteerName]);
  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="volunteer_id" value={volunteerId} />
      <input type="hidden" name="badge" value={badge} />
      {needsNote && <textarea className="input small" name="note" rows={2} placeholder={needsNote} aria-label={needsNote} />}
      {state?.error && (
        <p className="notice notice-red small" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? 'Signing…' : 'Sign badge'}
      </button>
    </form>
  );
}
