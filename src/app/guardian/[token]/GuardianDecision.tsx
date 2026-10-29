'use client';

import { useState, useTransition } from 'react';
import { decideSharing, type DecideState } from '../../confirm/[token]/actions';

export function GuardianDecision({ token, first, approved }: { token: string; first: string; approved: boolean | null }) {
  const [state, setState] = useState<DecideState>(null);
  const [pending, start] = useTransition();
  const now = state?.done ? state.done === 'confirmed' : approved;
  const decide = (yes: boolean) => start(async () => setState(await decideSharing(token, yes)));

  return (
    <div className="stack">
      {now === true && (
        <p className="notice" role="status">
          Sharing is on. {first} can share their hours. You can turn it off here any time; every link they made stops working at once.
        </p>
      )}
      {now === false && (
        <p className="notice" role="status">
          Sharing is off. Nothing about {first} is public.
        </p>
      )}
      {state?.error && (
        <p className="notice notice-red" role="alert">
          {state.error}
        </p>
      )}
      <div className="row wrap" style={{ gap: 8 }}>
        {now !== true && (
          <button className="btn btn-primary btn-big" disabled={pending} onClick={() => decide(true)}>
            Approve sharing
          </button>
        )}
        <button className="btn btn-big" disabled={pending} onClick={() => decide(false)}>
          {now === true ? 'Turn sharing off' : 'Don’t allow'}
        </button>
      </div>
    </div>
  );
}
