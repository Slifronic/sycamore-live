'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionCard, type SessionAttendance } from '@/components/vol/SessionCard';
import type { ActiveSession } from '@/lib/vol-data';
import { Icon } from '@/components/shell/icons';
import c from './checkin.module.css';

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
// Arriving from the event's QR (fromQr), the one action is "Check in now".
// Otherwise Scan QR is the primary and typing the code is the fallback.
export function CheckinForm({ initialCode, fromQr, ready }: { initialCode: string; fromQr: boolean; ready: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const oneTap = fromQr && ready && code === initialCode;

  return (
    <div className={c.stack}>
      {!oneTap && <ScanButton onTypeInstead={() => input.current?.focus()} />}
      <form
        className={oneTap ? c.form : `${c.form} ${c.formQuiet}`}
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
        {!oneTap && (
          <p className={c.or} aria-hidden>
            <span>or type the event code</span>
          </p>
        )}
        <div className={oneTap ? c.codeBig : c.codeRow}>
          <label htmlFor="checkin-code" className="sr-only">
            Event code
          </label>
          <input
            ref={input}
            id="checkin-code"
            className={`input ${c.code}`}
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
            aria-describedby="checkin-code-hint"
          />
          <button className={`btn btn-primary ${oneTap ? 'btn-big' : ''} ${c.submit}`} disabled={busy || code.length !== 6}>
            {busy ? 'Checking you in…' : oneTap ? 'Check in now' : 'Check in'}
          </button>
        </div>
        <span id="checkin-code-hint" className="sr-only">
          6 letters and numbers, on the sign at the sign-in table
        </span>
        {error && (
          <p className="notice notice-red" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

// The minimal shape of the browser's BarcodeDetector (Chrome on Android,
// Safari 17+ behind a flag); not in TypeScript's DOM types yet.
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;
const detectorCtor = () => (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

/** A scanned QR → where to go: our check-in link, a walk-in link, or a bare code. */
function destination(raw: string): string | null {
  const text = raw.trim();
  if (/^[A-Z0-9]{6}$/i.test(text)) return `/checkin?code=${text.toUpperCase()}`;
  try {
    const u = new URL(text, window.location.origin);
    const codeParam = u.searchParams.get('code');
    if (u.pathname === '/checkin' && codeParam) return `/checkin?code=${encodeURIComponent(codeParam.toUpperCase().slice(0, 6))}`;
    const w = u.pathname.match(/^\/w\/([A-Za-z0-9_-]+)$/);
    if (w) return `/w/${w[1]}`;
  } catch {
    /* not a URL */
  }
  return null;
}

// Scan QR: the camera in a full-screen sheet, read with BarcodeDetector. Where
// the browser can't (iPhone Safari today), the sheet says to use the Camera
// app, which opens the same /checkin?code=… link.
function ScanButton({ onTypeInstead }: { onTypeInstead: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'starting' | 'scanning' | 'unsupported' | 'denied' | 'unknown'>('starting');

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const start = () => {
    const can = !!detectorCtor() && !!navigator.mediaDevices?.getUserMedia;
    setState(can ? 'starting' : 'unsupported');
    setOpen(true);
  };

  useEffect(() => {
    const Ctor = detectorCtor();
    if (!open || !Ctor || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const detector = new Ctor({ formats: ['qr_code'] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => {});
        setState('scanning');
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(v);
            for (const f of found) {
              const to = destination(f.rawValue);
              if (to) {
                stopped = true;
                navigator.vibrate?.(12);
                setOpen(false);
                router.push(to);
                return;
              }
              setState('unknown');
            }
          } catch {
            /* a frame that couldn't be read; try the next one */
          }
          timer = setTimeout(tick, 180);
        };
        tick();
      })
      .catch(() => setState('denied'));
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, router]);

  return (
    <>
      <button type="button" className={`btn btn-primary btn-big ${c.scan}`} onClick={start} aria-haspopup="dialog">
        <Icon name="scan" size={20} className={c.scanIcon} /> Scan QR code
      </button>
      <dialog
        ref={dialog}
        className={c.sheet}
        aria-labelledby="scan-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        {open && (
          <div className={c.sheetInner}>
            <div className={c.sheetHead}>
              <h2 id="scan-title" className={c.sheetTitle}>
                Scan the event QR
              </h2>
              <button type="button" className={c.close} onClick={() => setOpen(false)} aria-label="Close">
                <Icon name="x" size={20} />
              </button>
            </div>
            {state === 'unsupported' || state === 'denied' ? (
              <div className={c.fallback}>
                <span className={c.fallbackIcon} aria-hidden>
                  <Icon name="scan" size={20} />
                </span>
                <p>
                  {state === 'denied' ? <b>The camera is off for this site.</b> : <b>This browser can’t scan here.</b>} Open your phone’s Camera app and point it at the QR at the sign-in table. It opens this page with
                  the code filled in.
                </p>
              </div>
            ) : (
              <div className={c.viewfinder}>
                <video ref={video} className={c.video} playsInline muted aria-label="Camera preview" />
                <span className={c.frame} aria-hidden />
                <p className={c.viewHint} role="status">
                  {state === 'starting' ? 'Starting the camera…' : state === 'unknown' ? 'That QR isn’t a SycaMore event. Try the one at the sign-in table.' : 'Point at the QR at the sign-in table'}
                </p>
              </div>
            )}
            <button
              type="button"
              className="btn btn-big"
              onClick={() => {
                setOpen(false);
                setTimeout(onTypeInstead, 50);
              }}
            >
              Type the code instead
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
