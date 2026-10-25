'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionCard, type SessionAttendance } from '@/components/vol/SessionCard';
import type { ActiveSession } from '@/lib/vol-data';

export function LiveSession({ session, name, isMinor, leave }: { session: ActiveSession; name: string; isMinor: boolean; leave: { available: boolean; opted_in: boolean } }) {
  const [att, setAtt] = useState<SessionAttendance>(session);
  return (
    <>
      <SessionCard
        att={att}
        name={name}
        isMinor={isMinor}
        orgName={session.org.name}
        chatHref={`/me/messages?event=${session.event.id}`}
        onChange={setAtt}
      />
      {att.status === 'checked_in' && leave.available && <LeaveAreaToggle attendanceId={att.id} orgName={session.org.name} initialOn={leave.opted_in} onCheckedOut={setAtt} />}
    </>
  );
}

type Presence = { tracking: boolean; inside?: boolean | null; suggest_checkout?: boolean; reason?: string };

// Opt-in, off by default, only when the coordinator set a site for the event.
// While this page is open and the toggle is on, the phone's location goes to
// POST /api/vol/presence at most once a minute. The server keeps no
// coordinates, only when you left; nobody is ever checked out by location alone.
function LeaveAreaToggle({ attendanceId, orgName, initialOn, onCheckedOut }: { attendanceId: string; orgName: string; initialOn: boolean; onCheckedOut: (a: SessionAttendance) => void }) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Presence | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!on || !('geolocation' in navigator)) return;
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last < 60_000) return; // one ping a minute is plenty
        last = Date.now();
        fetch('/api/vol/presence', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ attendance_id: attendanceId, lat: p.coords.latitude, lng: p.coords.longitude, accuracy_m: p.coords.accuracy }),
        })
          .then((r) => r.json())
          .then((r: Presence) => {
            setResult(r);
            if (r.reason === 'no_site') setHidden(true);
            if (r.inside) setDismissed(false);
          })
          .catch(() => {});
      },
      () => setError('Location is off for this site, so the check isn’t running. You can still check out as usual.'),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [on, attendanceId]);

  if (hidden) return null;

  const toggle = async () => {
    setBusy(true);
    setError('');
    const res = await fetch('/api/vol/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attendance_id: attendanceId, opt_in: !on }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error ?? 'That didn’t go through. Try again.');
    setOn(!!data.opt_in);
    setResult(null);
  };

  return (
    <section className="card card-pad stack" aria-labelledby="leave-check">
      <label className="row between" style={{ gap: 14, alignItems: 'flex-start', cursor: 'pointer' }}>
        <span className="stack" style={{ gap: 4 }}>
          <strong id="leave-check">Help {orgName} see if I leave early</strong>
          <span className="small muted">
            Uses your location only while this page is open. No coordinates are stored: only the time you left the area, and it’s deleted once your hours are verified.
          </span>
        </span>
        <input type="checkbox" role="switch" checked={on} disabled={busy} onChange={toggle} aria-labelledby="leave-check" style={{ width: 24, height: 24, flex: 'none', accentColor: 'var(--primary)' }} />
      </label>
      {on && !error && <p className="small muted">{result?.tracking ? (result.inside === false ? 'You look outside the event area.' : 'You’re inside the event area.') : 'On. Checking about once a minute while this page is open.'}</p>}
      {on && result?.suggest_checkout && !dismissed && (
        <div className="notice notice-amber stack" role="alert" style={{ gap: 10 }}>
          <span>Looks like you’ve left the event. Check out now?</span>
          <span className="row wrap" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={async () => {
                const res = await fetch('/api/vol/checkout', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ attendance_id: attendanceId, client_time: new Date().toISOString() }),
                }).catch(() => null);
                const data = await res?.json().catch(() => null);
                if (res?.ok && data?.attendance) onCheckedOut(data.attendance);
                else setError(data?.error ?? 'That didn’t go through. Use the Check out button above.');
              }}
            >
              Check out
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setDismissed(true)}>
              I’m still here
            </button>
          </span>
        </div>
      )}
      {error && (
        <p className="notice notice-red small" role="alert">
          {error}
        </p>
      )}
    </section>
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
          placeholder="••••••"
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
