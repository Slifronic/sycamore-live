'use client';

import { useState, useTransition } from 'react';
import type { WalkinPanel } from '@/lib/walkin-panel';
import s from './event.module.css';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });

// The second QR code on event day: for people who have never signed up. It
// works only while the event is on, and the coordinator can switch it off or
// replace it (which kills every photo of the old one).
export function WalkinCard(props: {
  eventId: string;
  panel: WalkinPanel;
  state: WalkinPanel['state'];   // re-computed by the parent as time passes
  count: number;                 // walk-ins on the live roster
  onChange: (p: WalkinPanel) => void;
  onFull: () => void;
}) {
  const { panel, state } = props;
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const send = (body: { open?: boolean; rotate?: boolean }) =>
    start(async () => {
      setError('');
      const res = await fetch(`/api/org/events/${props.eventId}/walkin`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? 'That didn’t work. Try again.');
      props.onChange(data.walkin);
    });

  const showQr = (state === 'open' || state === 'not_yet') && panel.qrSvg;

  return (
    <section className={`card ${s.walkin}`} aria-labelledby="walkin-title">
      <div>
        <p className="eyebrow">New here?</p>
        <h2 id="walkin-title" className={s.walkinTitle}>Walk-in sign-up</h2>
        <p className="small muted">
          For someone who just showed up. They scan this, sign up with {panel.google ? 'Google or ' : ''}name, email and birth date, and they’re checked in.
        </p>
      </div>

      {showQr ? (
        <>
          <div className={s.walkinQr} role="img" aria-label="Walk-in sign-up QR code" dangerouslySetInnerHTML={{ __html: panel.qrSvg! }} />
          <p className="small" style={{ textAlign: 'center' }}>
            {state === 'open' ? (
              <>Works until <strong>{time(panel.closes)}</strong>, or until you verify.</>
            ) : (
              <>Starts working at <strong>{time(panel.opens)}</strong>, 2 hours before the event.</>
            )}
          </p>
          {props.count > 0 && (
            <p className="chip chip-green" style={{ justifySelf: 'center' }}>
              {props.count} signed up at the door
            </p>
          )}
          <div className="row wrap" style={{ gap: 6, justifyContent: 'center' }}>
            {state === 'open' && (
              <button className="btn btn-sm" onClick={props.onFull}>
                Full screen
              </button>
            )}
            <button className="btn btn-sm btn-quiet" disabled={pending} onClick={() => send({ open: false })}>
              Turn off
            </button>
            <button
              className="btn btn-sm btn-quiet"
              disabled={pending}
              onClick={() => {
                if (window.confirm('Make a new walk-in link? The current QR code, and any photo or print of it, stops working.')) send({ rotate: true });
              }}
            >
              New link
            </button>
          </div>
        </>
      ) : state === 'off' ? (
        <div className="stack" style={{ gap: 8 }}>
          <p className="small">Sign-up at the door is off. People without an account can still be added by name.</p>
          <button className="btn btn-sm" disabled={pending} onClick={() => send({ open: true })}>
            Turn on
          </button>
        </div>
      ) : state === 'expired' ? (
        <p className="small">
          Closed at {time(panel.closes)}. The QR code no longer works. Add late arrivals by name.
          {props.count > 0 && <> {props.count} people signed up at the door.</>}
        </p>
      ) : null}

      {!panel.google && showQr && (
        <p className="small muted">
          Google sign-in is off until <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> is set. The short form works without it.
        </p>
      )}
      {error && (
        <p className="notice notice-red" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
