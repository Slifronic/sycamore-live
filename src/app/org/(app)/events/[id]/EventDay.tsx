'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { AttendanceRow } from '@/lib/types';
import { addByName, addPracticeVolunteer, checkOutEveryone, checkOutNow } from '../../../actions';
import Link from 'next/link';
import { SheetImport } from './SheetImport';
import { SiteSetup } from './SiteSetup';
import { WalkinCard } from './WalkinCard';
import type { WalkinPanel } from '@/lib/walkin-panel';
import s from './event.module.css';

type Row = Omit<AttendanceRow, 'checked_in_at' | 'checked_out_at' | 'left_area_at'> & { checked_in_at: string | null; checked_out_at: string | null; left_area_at: string | null };

const METHOD: Record<string, string> = { qr: 'QR scan', code: 'Typed code', coordinator: 'Added by you', paper_import: 'Paper sheet', walk_in: 'Signed up at the door' };

// The walk-in link's server state, moved forward by the clock on this screen.
function liveWalkinState(w: WalkinPanel, now: number): WalkinPanel['state'] {
  if (w.state === 'off' || w.state === 'verified') return w.state;
  if (now < Date.parse(w.opens)) return 'not_yet';
  if (now > Date.parse(w.closes)) return 'expired';
  return 'open';
}
const t = (d: string | null) => (d ? new Date(d).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }) : '—');

export function EventDay(props: {
  eventId: string;
  code: string;
  qrSvg: string;
  url: string;
  practice: boolean;
  verified: boolean;
  initial: Row[];
  aiEnabled: boolean;
  eventDate: string;
  site: { lat: number | null; lng: number | null; radius_m: number };
  walkin: WalkinPanel | null;
  now: number;
}) {
  const [rows, setRows] = useState<Row[]>(props.initial);
  const [walkin, setWalkin] = useState(props.walkin);
  const [now, setNow] = useState(props.now);
  const walkinLive = walkin ? liveWalkinState(walkin, now) : null;
  const walkins = rows.filter((r) => r.method === 'walk_in').length;
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [full, setFull] = useState(false);
  const [pending, start] = useTransition();
  const known = useRef(new Set(props.initial.map((r) => r.id)));
  const [arrived, setArrived] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const boundAdd = addByName.bind(null, props.eventId);
  const [addState, addAction, adding] = useActionState(boundAdd, null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Live roster: poll every 3 seconds (contract: good enough, no websockets).
  useEffect(() => {
    if (props.verified) return;
    let alive = true;
    const tick = async () => {
      const res = await fetch(`/api/org/events/${props.eventId}`, { cache: 'no-store' });
      if (!res.ok || !alive) return;
      const data = (await res.json()) as { attendance: Row[] };
      const added = data.attendance.filter((r) => !known.current.has(r.id));
      added.forEach((r) => known.current.add(r.id));
      // New rows keep a still marker until the next poll; nothing moves on the check-in path.
      setFresh(new Set(added.map((r) => r.id)));
      if (added.length) setArrived(`${added.map((r) => r.display_name).join(', ')} checked in.`);
      setRows(data.attendance);
      setNow(Date.now());
    };
    const iv = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [props.eventId, props.verified]);

  useEffect(() => {
    if (addState?.ok && nameRef.current) nameRef.current.value = '';
  }, [addState]);

  // Full-screen QR is a native modal dialog: the page behind is inert, Esc closes
  // it, and focus goes back to the button that opened it.
  useEffect(() => {
    const d = dialog.current;
    if (full && d && !d.open) d.showModal();
  }, [full]);

  const here = rows.filter((r) => r.status === 'checked_in').length;
  const left = rows.filter((r) => r.status !== 'checked_in' && r.status !== 'no_show').length;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {arrived}
      </p>
      <div className={`${s.grid} ${s.still}`}>
        <div className={s.side}>
        {props.verified ? (
          <section className={`card ${s.qrCard}`}>
            <span className="chip chip-green" style={{ height: 32, fontSize: 14 }}>✓ Verified</span>
            <p className={s.code}>{rows.filter((r) => r.status === 'attested').length}</p>
            <p className="small muted" style={{ textAlign: 'center' }}>
              hour records issued. Each volunteer can share theirs from their phone; anyone can check it at a public link.
            </p>
          </section>
        ) : (
        <section className={`card ${s.qrCard}`}>
          <div className={s.qr} role="img" aria-label={`Check-in QR code for code ${props.code}`} dangerouslySetInnerHTML={{ __html: props.qrSvg }} />
          <p className={s.code}>{props.code}</p>
          <p className="small muted" style={{ textAlign: 'center' }}>
            Scan to check in, or type the code at <br />
            <strong>{props.url.replace(/^https?:\/\//, '').split('/checkin')[0]}/checkin</strong>
          </p>
          <button className="btn btn-primary" onClick={() => setFull(true)}>
            Show QR full screen
          </button>
          <Link className="btn btn-sm btn-quiet" href={`/org/events/${props.eventId}/sign`} target="_blank">
            Print a sign for the table
          </Link>
        </section>
        )}
        {walkin && walkinLive && walkinLive !== 'verified' && !props.verified && !props.practice && (
          <WalkinCard
            eventId={props.eventId}
            panel={walkin}
            state={walkinLive}
            count={walkins}
            onChange={(p) => {
              setWalkin(p);
              setNow(Date.now());
            }}
            onFull={() => setFull(true)}
          />
        )}
        </div>

        <section className="card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Roster{!props.verified && ' · updates live'}</p>
              <p className={s.headcount} aria-live="polite" aria-atomic="true">
                <span className="figure" style={{ fontSize: 44 }}>{props.verified ? rows.length : here}</span>
                <span className="figure-unit">{props.verified ? 'on the record' : 'here now'}</span>
                <span className="small muted" style={{ marginLeft: 10 }}>
                  {left} checked out
                </span>
              </p>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {props.practice && !props.verified && (
                <button className="btn btn-sm" disabled={pending} onClick={() => start(() => addPracticeVolunteer(props.eventId))}>
                  + Add a practice volunteer
                </button>
              )}
              {here > 0 && !props.verified && (
                <button
                  className="btn btn-sm"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Check out all ${here} people still here, as of now?`)) start(() => checkOutEveryone(props.eventId));
                  }}
                >
                  Check out all {here}
                </button>
              )}
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="card-pad stack" style={{ justifyItems: 'start' }}>
              <p className="muted">
                Nobody yet. When volunteers scan the QR code, their names appear here within a few seconds.
              </p>
              {props.practice && <p className="small">This is a practice event. Tap “Add a practice volunteer” to see how it fills in.</p>}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="t tight">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">In → Out</th>
                    <th scope="col">Hours</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={fresh.has(r.id) ? 'fresh' : ''}>
                      <td>
                        <strong>{r.display_name}</strong>
                        {r.new_signup && (
                          <span className="chip chip-green" style={{ height: 20, fontSize: 11, marginLeft: 6 }} title="Signed up for the first time at this event">
                            New
                          </span>
                        )}
                        <span className="small muted" style={{ display: 'block' }}>
                          {METHOD[r.method]}
                          {r.ai_confidence != null && ` · ${Math.round(Number(r.ai_confidence) * 100)}% sure`}
                          {r.status === 'checked_in' && r.location_opt_in && ' · 📍 location on'}
                        </span>
                        {r.status === 'checked_in' && r.left_area_at && (
                          <span className={`small ${s.left}`}>
                            Left the area around {t(r.left_area_at)}{r.left_area_m ? ` (${r.left_area_m >= 1000 ? `${(r.left_area_m / 1000).toFixed(1)} km` : `${r.left_area_m} m`} away)` : ''}?
                          </span>
                        )}
                      </td>
                      <td className="num small" style={{ whiteSpace: 'nowrap' }}>
                        {t(r.checked_in_at)} → {t(r.checked_out_at)}
                      </td>
                      <td className="num">{r.status === 'checked_in' ? (
                          <span className="chip chip-ink">
                            <span className={s.dot} aria-hidden />
                            here
                          </span>
                        ) : (
                          Number(r.hours_adjusted ?? r.hours_captured)
                        )}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {r.status === 'checked_in' && !props.verified && (
                          <button className="btn btn-sm btn-quiet" onClick={() => start(() => checkOutNow(props.eventId, r.id))}>
                            Check out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!props.verified && (
            <div className={s.tools}>
              <form action={addAction} className="row" style={{ flex: '1 1 320px' }}>
                <input ref={nameRef} className="input" name="name" placeholder="No phone? Type their name" aria-label="Volunteer name" />
                <button className="btn" disabled={adding}>
                  Add by name
                </button>
              </form>
              <SheetImport eventId={props.eventId} enabled={props.aiEnabled} eventDate={props.eventDate} rosterNames={rows.map((r) => r.display_name)} />
            </div>
          )}
          {addState?.error && (
            <p className="notice notice-red" role="alert" style={{ margin: '0 20px 16px' }}>
              {addState.error}
            </p>
          )}
        </section>
      </div>
      {!props.verified && <SiteSetup eventId={props.eventId} initial={props.site} />}

      {full && (
        <dialog ref={dialog} className={s.full} aria-label="Check-in QR code" onClose={() => setFull(false)}>
          <button className={`btn ${s.close}`} onClick={() => dialog.current?.close()} autoFocus>
            Close <span className="muted small">(Esc)</span>
          </button>
          {walkinLive === 'open' && walkin?.qrSvg && !props.practice ? (
            // Two codes side by side: one for people already signed up, one for walk-ins.
            <div className={s.fullPair}>
              <div className={s.fullHalf}>
                <p className={s.fullTitle}>Check in here</p>
                <div className={s.fullQrHalf} role="img" aria-label={`Check-in QR code for code ${props.code}`} dangerouslySetInnerHTML={{ __html: props.qrSvg }} />
                <p className={s.fullCode}>{props.code}</p>
                <p className={s.fullHint}>Already signed up? Scan in, and again when you leave.</p>
              </div>
              <div className={s.fullHalf}>
                <p className={s.fullTitle}>First time here?</p>
                <div className={s.fullQrHalf} role="img" aria-label="Walk-in sign-up QR code" dangerouslySetInnerHTML={{ __html: walkin.qrSvg }} />
                <p className={s.fullHint}>
                  Scan to sign up in under a minute{walkin.google ? ' with Google or your email' : ''}. You’re checked in when you’re done.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className={s.fullTitle}>Check in here</p>
              <div className={s.fullQr} role="img" aria-label={`Check-in QR code for code ${props.code}`} dangerouslySetInnerHTML={{ __html: props.qrSvg }} />
              <p className={s.fullCode}>{props.code}</p>
              <p className={s.fullHint}>Scan with your phone camera. Scan again when you leave.</p>
            </>
          )}
          <p className={s.fullCount} aria-live="polite" aria-atomic="true">
            {here} checked in
          </p>
        </dialog>
      )}
    </>
  );
}
