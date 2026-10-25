'use client';

import { useActionState, useEffect } from 'react';
import { signAllBadges, signBadge } from '../../actions';
import { toast } from '@/components/shell/Toast';
import { Popover } from '@/components/ui/Popover';
import { Icon } from '@/components/shell/icons';
import s from './badges.module.css';

/**
 * One row's "Sign" button. A badge whose rule asks for the coordinator's note
 * opens a small popover for it; the rest sign in one click. The row leaves the
 * list once signed (the page revalidates), so the toast is the confirmation.
 */
export function SignBadgeForm({ volunteerId, badge, badgeName, volunteerName, needsNote }: { volunteerId: string; badge: string; badgeName: string; volunteerName: string; needsNote: string | null }) {
  const [state, action, pending] = useActionState(signBadge, null);
  useEffect(() => {
    if (state?.ok) toast.success(`${badgeName} signed`, { body: `${volunteerName} can see it on their record now.` });
    else if (state?.error && !needsNote) toast.error(state.error);
  }, [state, badgeName, volunteerName, needsNote]);

  const hidden = (
    <>
      <input type="hidden" name="volunteer_id" value={volunteerId} />
      <input type="hidden" name="badge" value={badge} />
    </>
  );

  if (!needsNote)
    return (
      <form action={action}>
        {hidden}
        <button className="btn btn-secondary btn-sm" disabled={pending} aria-label={`Sign ${badgeName} for ${volunteerName}`}>
          {pending ? 'Signing…' : 'Sign'}
        </button>
      </form>
    );

  return (
    <Popover
      label={`Sign ${badgeName} for ${volunteerName}`}
      placement="bottom-end"
      panelClassName={s.notePanel}
      trigger={(p) => (
        <button {...p} type="button" className="btn btn-secondary btn-sm">
          Sign <Icon name="chevron-down" size={14} />
        </button>
      )}
    >
      <form action={action} className={s.noteForm}>
        {hidden}
        <label className={s.noteLabel} htmlFor={`note-${volunteerId}-${badge}`}>
          {needsNote}
        </label>
        <textarea id={`note-${volunteerId}-${badge}`} className="input small" name="note" rows={3} required minLength={10} placeholder="One or two sentences, in your words" />
        {state?.error && (
          <p className="notice notice-red small" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? 'Signing…' : `Sign ${badgeName}`}
        </button>
      </form>
    </Popover>
  );
}

/** The page's one ink action: sign every ready badge that needs no note. */
export function SignAllForm({ count }: { count: number }) {
  const [state, action, pending] = useActionState(signAllBadges, null);
  useEffect(() => {
    if (state?.ok) toast.success(state.ok, { body: 'Each volunteer can see theirs on their record now.' });
    else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={action}>
      <button className="btn btn-primary" disabled={pending}>
        <Icon name="check" size={16} /> {pending ? 'Signing…' : `Sign all ${count}`}
      </button>
    </form>
  );
}
