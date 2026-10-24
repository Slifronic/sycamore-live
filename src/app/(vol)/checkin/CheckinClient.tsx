'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionCard, type SessionAttendance } from '@/components/vol/SessionCard';
import type { ActiveSession } from '@/lib/vol-data';

export function LiveSession({ session, name, isMinor }: { session: ActiveSession; name: string; isMinor: boolean }) {
  const [att, setAtt] = useState<SessionAttendance>(session);
  return (
    <SessionCard
      att={att}
      name={name}
      isMinor={isMinor}
      orgName={session.org.name}
      chatHref={`/me/messages?event=${session.event.id}`}
      onChange={setAtt}
    />
  );
}

// Posts only the code. The server finds the event and stamps the time.
export function CheckinForm({ initialCode, fromQr, ready }: { initialCode: string; fromQr: boolean; ready: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="card card-pad stack"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const res = await fetch('/api/vol/checkin', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code, via: fromQr && code === initialCode ? 'qr' : 'code' }),
          });
          const data = await res.json().catch(() => ({}));
          // Checked in now, or already checked in here: show the session.
          if (res.ok || (res.status === 409 && data.attendance)) {
            router.replace('/checkin');
            router.refresh();
            return;
          }
          setError(data.error ?? 'That didn’t go through. Try again.');
        } catch {
          setError('No connection. Move closer to the sign-in table and try again.');
        }
        setBusy(false);
      }}
    >
      <div className="field">
        <label htmlFor="checkin-code">Event code</label>
        <input
          id="checkin-code"
          className="input"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          required
          minLength={6}
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          placeholder="PLANT2"
          style={{ height: 60, fontSize: 28, letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700 }}
        />
      </div>
      {error && (
        <p className="notice notice-red" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-big" disabled={busy || code.length !== 6}>
        {busy ? 'Checking you in…' : fromQr && ready ? 'Check in now' : 'Check in'}
      </button>
    </form>
  );
}
