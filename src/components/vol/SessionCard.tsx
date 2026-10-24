'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './session.module.css';

// The active-session screen: a running timer and one big Check out button.
// This is the only place a volunteer sees a live number, and it is never sent
// anywhere: check-out posts only the attendance id and the time of the tap
// (POST /api/vol/checkout), and the server computes hours from its own stamps.
// Used by the walk-in page and by /checkin.

export type SessionAttendance = { id: string; status: string; checked_in_at: string | null; checked_out_at: string | null };

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });
const first = (name: string) => name.split(/\s+/)[0] ?? name;

// The confirmation mark: a ring and a tick that draw in once (about half a
// second, never blocking the button below it). Without JS or with reduced
// motion it's simply drawn.
function Tick({ tone = 'green' }: { tone?: 'green' | 'ink' }) {
  return (
    <svg className={`${s.tick} ${tone === 'ink' ? s.tickInk : ''}`} viewBox="0 0 52 52" width="52" height="52" aria-hidden>
      <circle className={s.tickRing} cx="26" cy="26" r="23" pathLength={1} />
      <path className={s.tickMark} d="M15 27 L23 34 L37 18" pathLength={1} />
    </svg>
  );
}

export function SessionCard(props: {
  att: SessionAttendance;
  name: string;
  isMinor: boolean;
  isNew?: boolean;
  orgName: string;
  eventTitle?: string;
  /** Group chat for this event, when the volunteer side has it. */
  chatHref?: string;
  onChange: (a: SessionAttendance) => void;
}) {
  const { att } = props;
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState<null | 'sending' | 'queued'>(null);
  const [error, setError] = useState('');
  const tapped = useRef<string | null>(null);

  useEffect(() => {
    if (att.status !== 'checked_in') return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [att.status]);

  const checkOut = useCallback(async () => {
    tapped.current ??= new Date().toISOString(); // a retry keeps the time of the first tap
    setSaving('sending');
    setError('');
    try {
      const res = await fetch('/api/vol/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attendance_id: att.id, client_time: tapped.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaving(null);
        setError(data.error ?? 'That didn’t go through. Ask the coordinator to check you out.');
        return;
      }
      setSaving(null);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(12);
      props.onChange({ ...att, ...data.attendance });
    } catch {
      setSaving('queued'); // no signal: keep the tap time and retry
    }
  }, [att, props]);

  useEffect(() => {
    if (saving !== 'queued') return;
    const iv = setTimeout(checkOut, 5000);
    return () => clearTimeout(iv);
  }, [saving, checkOut]);

  if (att.status !== 'checked_in') {
    return (
      <section className={`${s.card} ${s.pop}`}>
        <div className={s.head}>
          <Tick tone="ink" />
          <p className={s.badge}>✓ Checked out{att.checked_out_at ? ` at ${clock(att.checked_out_at)}` : ''}</p>
        </div>
        <h2 className={s.h2}>Thanks, {first(props.name)}</h2>
        <p>{props.orgName} confirms everyone’s hours when the event closes. After that, your record is in My hours{props.isMinor ? '' : ', ready to share'}.</p>
        <Link className={`${s.btn} ${s.primary}`} href="/me">
          Open My hours
        </Link>
      </section>
    );
  }

  const secs = att.checked_in_at ? Math.max(0, Math.floor((now - Date.parse(att.checked_in_at)) / 1000)) : 0;
  const mins = Math.floor(secs / 60);
  return (
    <section className={`${s.card} ${s.pop}`}>
      <div className={s.head}>
        <Tick />
        <p className={s.badge}>✓ Checked in{att.checked_in_at ? ` at ${clock(att.checked_in_at)}` : ''}</p>
      </div>
      <h2 className={s.h2}>{props.isNew ? `You’re signed up, ${first(props.name)}` : `You’re here, ${first(props.name)}`}</h2>
      {props.eventTitle && <p className={s.event}>{props.eventTitle} · {props.orgName}</p>}
      <div className={s.timerRow}>
        <p className={s.timer} aria-live="off">
          {Math.floor(mins / 60)}
          <span>h</span> {String(mins % 60).padStart(2, '0')}
          <span>m</span>
          <span className={s.secs} suppressHydrationWarning>
            {String(secs % 60).padStart(2, '0')}s
          </span>
        </p>
        <span className={s.liveDot} aria-hidden />
        <span className="sr-only">Time since you checked in: {Math.floor(mins / 60)} hours {mins % 60} minutes</span>
      </div>
      <p className={s.muted}>The coordinator can see you on the roster now. Tap Check out when you leave, so your hours count.</p>
      <button className={`${s.btn} ${s.primary}`} disabled={saving === 'sending'} onClick={checkOut}>
        {saving === 'sending' ? 'Checking you out…' : 'Check out'}
      </button>
      {saving === 'queued' && (
        <p className={s.notice} role="status">
          Saved on this phone. It will send when you have signal, with the time you tapped.
        </p>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.links}>
        {props.chatHref && (
          <Link className={s.link} href={props.chatHref}>
            Group chat
          </Link>
        )}
        <Link className={s.link} href="/me">
          My hours
        </Link>
      </div>
      <p className={s.fine}>
        You can close this page. To check out later, open SycaMore again on this phone.
        {props.isMinor && ' Because you’re under 18, sharing your record will need a parent or guardian’s OK.'}
      </p>
    </section>
  );
}
