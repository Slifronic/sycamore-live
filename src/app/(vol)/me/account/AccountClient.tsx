'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/shell/icons';
import { toast } from '@/components/shell/Toast';
import s from './account.module.css';

// Announcements opt-in: marketing consent, off until the volunteer turns it on.
export function MarketingSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby="optin-hint"
      className={s.row}
      disabled={busy}
      onClick={async () => {
        const next = !on;
        setBusy(true);
        setOn(next); // optimistic; put back if it fails
        const res = await fetch('/api/vol/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ marketing_opt_in: next }) }).catch(() => null);
        setBusy(false);
        if (!res?.ok) {
          setOn(!next);
          toast.error('That didn’t save', { body: 'Check your connection and try again.' });
          return;
        }
        toast(next ? 'Announcements on' : 'Announcements off');
      }}
    >
      <span className={s.rowIcon} aria-hidden>
        <Icon name="megaphone" size={20} />
      </span>
      <span className={s.rowText}>
        <span className={s.rowLabel}>News and announcements</span>
        <span id="optin-hint" className={s.rowHint}>
          Occasional SycaMore news. Event messages still arrive.
        </span>
      </span>
      <span className={s.switch} data-on={on || undefined} aria-hidden />
    </button>
  );
}

// Delete my account: a confirm sheet where the volunteer types DELETE.
export function DeleteAccount() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = text.trim().toUpperCase() === 'DELETE';

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button type="button" className={`${s.row} ${s.danger}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className={s.rowIcon} aria-hidden>
          <Icon name="trash" size={20} />
        </span>
        <span className={s.rowText}>
          <span className={s.rowLabel}>Delete my account</span>
        </span>
        <Icon name="chevron-right" size={16} className={s.chev} />
      </button>

      <dialog
        ref={dialog}
        className={s.sheet}
        aria-labelledby="delete-title"
        onClose={() => {
          setOpen(false);
          setText('');
          setError('');
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <form
          className={s.sheetInner}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready) return;
            setBusy(true);
            setError('');
            const res = await fetch('/api/vol/account', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) }).catch(() => null);
            if (!res?.ok) {
              const data = await res?.json().catch(() => null);
              setBusy(false);
              setError(data?.error ?? 'No connection. Try again.');
              return;
            }
            window.location.assign('/join?deleted=1');
          }}
        >
          <div className={s.sheetHead}>
            <h2 id="delete-title" className={s.sheetTitle}>
              Delete your account?
            </h2>
            <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Close">
              <Icon name="x" size={20} />
            </button>
          </div>
          <p className={s.sheetText}>
            We delete your profile and messages; your hours stay in each organization’s totals as “Former volunteer”, with no name attached.
          </p>
          <p className={s.sheetFine}>
            Share links stop working and this can’t be undone.{' '}
            <a href="/api/vol/account/export" download>
              Download your data
            </a>{' '}
            first if you want a copy.
          </p>
          <div className="field">
            <label htmlFor="delete-confirm">Type DELETE to confirm</label>
            <input id="delete-confirm" className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
          </div>
          {error && (
            <p className="notice notice-red small" role="alert">
              {error}
            </p>
          )}
          <button className={`btn btn-big ${s.deleteBtn}`} disabled={!ready || busy}>
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </form>
      </dialog>
    </>
  );
}
