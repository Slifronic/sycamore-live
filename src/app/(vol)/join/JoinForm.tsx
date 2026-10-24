'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JoinForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="card card-pad stack"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          const res = await fetch('/api/vol/join', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: f.get('name'), email: f.get('email'), date_of_birth: f.get('dob') }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(data.error ?? 'That didn’t go through. Try again.');
            setBusy(false);
            return;
          }
          router.replace(next);
          router.refresh();
        } catch {
          setError('No connection. Try again when you have signal.');
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="join-name">Your name</label>
        <input id="join-name" className="input" name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="As you want it on your record" />
      </div>
      <div className="field">
        <label htmlFor="join-email">Email</label>
        <input id="join-email" className="input" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required maxLength={200} />
      </div>
      <div className="field">
        <label htmlFor="join-dob">Date of birth</label>
        <input id="join-dob" className="input" name="dob" type="date" required max={new Date().toISOString().slice(0, 10)} />
        <span className="hint">Only used to check you’re 13 or older, and whether sharing needs a guardian’s OK.</span>
      </div>
      {error && (
        <p className="notice notice-red" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-big" disabled={busy}>
        {busy ? 'One moment…' : 'Continue'}
      </button>
      <p className="small muted">For volunteers 13 and older. You never type your hours: they come from checking in and out, and the organization confirms them.</p>
    </form>
  );
}
