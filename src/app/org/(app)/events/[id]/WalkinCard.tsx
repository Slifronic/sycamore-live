'use client';

import { useState, useTransition } from 'react';
import type { WalkinPanel } from '@/lib/walkin-panel';
import type { MenuItem } from '@/components/ui/Popover';
import s from './event.module.css';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });

// Walk-in sign-up: the "New here" side of the event-day QR card, for people who
// have never signed up. It works only while the event is on, and the
// coordinator can switch it off or replace it (which kills every photo of the old one).

/** Turn the walk-in link on or off, or replace it. */
export function useWalkinControls(eventId: string, onChange: (p: WalkinPanel) => void) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const send = (body: { open?: boolean; rotate?: boolean }) =>
    start(async () => {
      setError('');
      const res = await fetch(`/api/org/events/${eventId}/walkin`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? 'That didn’t work. Try again.');
      onChange(data.walkin);
    });
  return { send, pending, error };
}

/** The walk-in items for the QR card's ⋯ menu. */
export function walkinMenuItems(state: WalkinPanel['state'], send: (b: { open?: boolean; rotate?: boolean }) => void): MenuItem[] {
  if (state === 'off') return [{ label: 'Turn on walk-in sign-up', icon: 'check', onSelect: () => send({ open: true }) }];
  if (state !== 'open' && state !== 'not_yet') return [];
  return [
    {
      label: 'New walk-in link',
      hint: 'The current code, and any photo of it, stops working',
      icon: 'key',
      onSelect: () => {
        if (window.confirm('Make a new walk-in link? The current QR code, and any photo or print of it, stops working.')) send({ rotate: true });
      },
    },
    { label: 'Turn off walk-in sign-up', icon: 'x', tone: 'danger', onSelect: () => send({ open: false }) },
  ];
}

/** The "New here" pane: the walk-in code, or why there isn't one right now. */
export function WalkinPane({ panel, state, count, pending, onTurnOn }: { panel: WalkinPanel; state: WalkinPanel['state']; count: number; pending: boolean; onTurnOn: () => void }) {
  const showQr = (state === 'open' || state === 'not_yet') && panel.qrSvg;
  if (showQr)
    return (
      <>
        <div className={`${s.qrTile} force-light`}>
          <div className={s.qr} role="img" aria-label="Walk-in sign-up QR code" dangerouslySetInnerHTML={{ __html: panel.qrSvg! }} />
        </div>
        <p className={s.paneTitle}>First time here?</p>
        <p className={s.qrHint}>
          {state === 'open' ? (
            <>
              They scan, sign up{panel.google ? ' with Google or email' : ''}, and they’re checked in. Works until <strong>{time(panel.closes)}</strong>.
            </>
          ) : (
            <>
              Starts working at <strong>{time(panel.opens)}</strong>, 2 hours before the event.
            </>
          )}
        </p>
        {count > 0 && <p className="chip chip-green">{count} signed up at the door</p>}
      </>
    );
  if (state === 'off')
    return (
      <div className={s.paneEmpty}>
        <p className={s.paneTitle}>Sign-up at the door is off</p>
        <p className={s.qrHint}>People without an account can still be added by name.</p>
        <button className="btn btn-sm" disabled={pending} onClick={onTurnOn}>
          Turn on
        </button>
      </div>
    );
  return (
    <div className={s.paneEmpty}>
      <p className={s.paneTitle}>Walk-in sign-up closed</p>
      <p className={s.qrHint}>
        Closed at {time(panel.closes)}. Add late arrivals by name.
        {count > 0 && <> {count} people signed up at the door.</>}
      </p>
    </div>
  );
}
