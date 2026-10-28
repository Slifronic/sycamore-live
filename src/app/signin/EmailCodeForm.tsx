'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Two steps on one card: the email, then the 6-digit code it was sent.

export function EmailCodeForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function post(url: string, body: object) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? 'That didn’t go through. Try again.');
      return res.ok;
    } catch {
      setError('No connection. Try again when you have signal.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <form
        className="stack"
        aria-busy={busy}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await post('/api/auth/email/send', { email })) setSent(true);
        }}
      >
        <div className="field">
          <label htmlFor="signin-email">Email</label>
          <input
            id="signin-email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && (
          <p className="notice notice-red" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-big" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a code'}
        </button>
      </form>
    );
  }

  return (
    <form
      className="stack"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get('code') ?? '');
        if (await post('/api/auth/email/verify', { email, code })) {
          router.replace(next);
          router.refresh();
        }
      }}
    >
      <p className="notice" role="status">
        If <strong>{email}</strong> has a SycaMore account, a 6-digit code is on its way. It works for 10 minutes.
      </p>
      <div className="field">
        <label htmlFor="signin-code">Code</label>
        <input id="signin-code" name="code" className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus />
      </div>
      {error && (
        <p className="notice notice-red" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-big" disabled={busy}>
        {busy ? 'Checking…' : 'Sign in'}
      </button>
      <button type="button" className="btn btn-quiet" onClick={() => (setSent(false), setError(''))}>
        Use a different email
      </button>
    </form>
  );
}
