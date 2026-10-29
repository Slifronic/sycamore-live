'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Consent, isTeen } from '@/components/vol/Consent';

export function JoinForm({ next, google }: { next: string; google: { name: string; email: string } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signin, setSignin] = useState(false);
  const [dob, setDob] = useState('');
  const [agreed, setAgreed] = useState(false);

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
            body: JSON.stringify({ name: f.get('name'), email: f.get('email'), date_of_birth: f.get('dob'), accept_terms: agreed, guardian_ok: agreed && isTeen(dob) }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(data.error ?? 'That didn’t go through. Try again.');
            setSignin(!!data.signin);
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
        <input id="join-name" className="input" name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="As you want it on your record" defaultValue={google?.name} />
      </div>
      <div className="field">
        <label htmlFor="join-email">Email</label>
        {google ? (
          <input id="join-email" className="input" value={google.email} readOnly aria-describedby="join-email-hint" />
        ) : (
          <input id="join-email" className="input" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required maxLength={200} />
        )}
        {google && (
          <span className="hint" id="join-email-hint">
            Confirmed by Google.
          </span>
        )}
      </div>
      <div className="field">
        <label htmlFor="join-dob">Date of birth</label>
        <input id="join-dob" className="input" name="dob" type="date" required max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(e) => setDob(e.target.value)} />
        <span className="hint">Checks you’re 13 or older, and whether sharing needs a guardian’s OK.</span>
      </div>
      <Consent dob={dob} checked={agreed} onChange={setAgreed} />
      {error && (
        <p className="notice notice-red" role="alert">
          {error}
          {signin && (
            <>
              {' '}
              <a href={next !== '/me' ? `/signin?next=${encodeURIComponent(next)}` : '/signin'}>Sign in</a>
            </>
          )}
        </p>
      )}
      <button className="btn btn-primary btn-big" disabled={busy}>
        {busy ? 'One moment…' : 'Continue'}
      </button>
    </form>
  );
}
