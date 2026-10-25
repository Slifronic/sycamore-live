'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/shell/Toast';
import s from './home.module.css';

// Checked in right now: a live timer and one Check out button, on the home
// screen. Same rule as the session screen: only the attendance id and the time
// of the tap are sent; the server works out the hours from its own stamps.
export function ActiveCard({ id, title, org, since, sinceLabel }: { id: string; title: string; org: string; since: string; sinceLabel: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tapped = useRef<string | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const secs = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);

  const checkOut = async () => {
    tapped.current ??= new Date().toISOString();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/vol/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attendance_id: id, client_time: tapped.current }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBusy(false);
        setError(data.error ?? 'That didn’t go through. Ask the coordinator to check you out.');
        return;
      }
      navigator.vibrate?.(12);
      toast.success('Checked out', { body: `Waiting for ${org} to confirm your hours.` });
      router.refresh();
    } catch {
      setBusy(false);
      setError('No connection. Try again, or open the check-in screen.');
    }
  };

  return (
    <section className={s.active} aria-labelledby="active-title">
      <div className={s.activeTop}>
        <span className={s.liveTag}>
          <span className={s.dot} aria-hidden /> Checked in
        </span>
        <Link href="/checkin" className={s.activeLink}>
          Details
        </Link>
      </div>
      <h2 id="active-title" className={s.activeTitle}>
        {title}
      </h2>
      <p className={s.activeSub}>
        {org} · since {sinceLabel}
      </p>
      <div className={s.activeRow}>
        <p className={s.timer} aria-hidden suppressHydrationWarning>
          {h}
          <span>h</span> {String(m).padStart(2, '0')}
          <span>m</span>
        </p>
        <span className="sr-only">
          Checked in for {h} hours {m} minutes
        </span>
        <button type="button" className={s.checkout} onClick={checkOut} disabled={busy}>
          {busy ? 'Checking out…' : 'Check out'}
        </button>
      </div>
      {error && (
        <p className={s.activeError} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
