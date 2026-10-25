'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/shell/icons';
import { toast } from '@/components/shell/Toast';
import s from './record.module.css';

// The record's two actions. Share: make the public link once, then copy it,
// show its QR, or hand it to the phone's share sheet. Use this record: a
// resume line or a scholarship sentence written from the record's facts.
// Each opens a sheet (a native modal <dialog>: focus moves in, Escape closes,
// a bottom sheet on phones). Volunteers under 18 see why sharing is off; the
// API refuses them too.

type Sheet = 'share' | 'use' | null;

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.warning('Couldn’t copy', { body: 'Select the text and copy it yourself.' });
  }
}

export function RecordActions(props: { recordId: string; url: string | null; qrSvg: string | null; isMinor: boolean; revoked: boolean; orgName: string }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (sheet && !d.open) d.showModal();
    if (!sheet && d.open) d.close();
  }, [sheet]);

  return (
    <>
      <div className={`${s.actions} no-print`}>
        <button type="button" className={`btn btn-primary btn-big ${s.action}`} onClick={() => setSheet('share')} aria-haspopup="dialog">
          <Icon name={props.isMinor ? 'shield' : 'share'} size={20} /> Share
        </button>
        {!props.revoked && (
          <button type="button" className={`btn btn-big ${s.action}`} onClick={() => setSheet('use')} aria-haspopup="dialog">
            <Icon name="copy" size={20} /> Use this record
          </button>
        )}
        <button type="button" className={`btn btn-quiet ${s.print}`} onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
      {props.isMinor && !props.revoked && <p className={`${s.minorNote} no-print`}>Sharing is off until a parent or guardian OKs it, because you’re under 18.</p>}

      <dialog
        ref={dialog}
        className={s.sheet}
        aria-labelledby={titleId}
        onClose={() => setSheet(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSheet(null); // a tap on the backdrop
        }}
      >
        <div className={s.sheetInner}>
          <div className={s.sheetHead}>
            <h2 id={titleId} className={s.sheetTitle}>
              {sheet === 'use' ? 'Use this record' : 'Share this record'}
            </h2>
            <button type="button" className={s.close} onClick={() => setSheet(null)} aria-label="Close">
              <Icon name="x" size={20} />
            </button>
          </div>
          {sheet === 'share' && <SharePane {...props} />}
          {sheet === 'use' && <UsePane recordId={props.recordId} orgName={props.orgName} />}
        </div>
      </dialog>
    </>
  );
}

function SharePane({ recordId, url, qrSvg, isMinor, revoked }: { recordId: string; url: string | null; qrSvg: string | null; isMinor: boolean; revoked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (revoked) return <p className="notice notice-red">The organization revoked this record, so it can’t be shared. Ask them why.</p>;
  if (isMinor)
    return (
      <div className={s.locked}>
        <span className={s.lockedIcon} aria-hidden>
          <Icon name="shield" size={20} />
        </span>
        <p>
          <b>Sharing needs a parent or guardian’s OK.</b> You’re under 18, so your records stay private to you for now. You can still print a copy or use the record in an application.
        </p>
      </div>
    );

  if (!url)
    return (
      <div className={s.paneStack}>
        <p className={s.paneText}>Make a link a school or scholarship committee can open to check this record. Only people you give it to can see it.</p>
        <button
          type="button"
          className="btn btn-primary btn-big"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            const res = await fetch(`/api/vol/records/${recordId}/share`, { method: 'POST' }).catch(() => null);
            const data = await res?.json().catch(() => ({}));
            setBusy(false);
            if (!res?.ok) return setError(data?.error ?? 'No connection. Try again.');
            toast.success('Your link is ready', { body: 'Anyone you give it to can check this record.' });
            router.refresh();
          }}
        >
          {busy ? 'Making your link…' : 'Create share link'}
        </button>
        {error && (
          <p className="notice notice-red small" role="alert">
            {error}
          </p>
        )}
      </div>
    );

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return (
    <div className={s.paneStack}>
      {qrSvg && (
        <div className={`${s.qrCard} force-light`}>
          <div className={s.qr} role="img" aria-label="QR code for the share link" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <span className={s.qrCaption}>Scan to open the public record</span>
        </div>
      )}
      <div className={s.linkRow}>
        <input className="input" readOnly value={url} aria-label="Share link" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary" onClick={() => copy(url, 'Link')}>
          <Icon name="copy" size={16} /> Copy
        </button>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {canNativeShare && (
          <button type="button" className="btn" onClick={() => navigator.share({ title: 'My service record', url }).catch(() => {})}>
            <Icon name="share" size={16} /> Share…
          </button>
        )}
        <a className="btn" href={url} target="_blank" rel="noopener">
          <Icon name="external" size={16} /> Open public page
        </a>
      </div>
      <p className={s.paneFine}>Anyone with the link sees the organization’s statement and who to call. No account needed.</p>
    </div>
  );
}

function UsePane({ recordId, orgName }: { recordId: string; orgName: string }) {
  const id = useId();
  const [busy, setBusy] = useState<null | 'resume' | 'scholarship'>(null);
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  const draft = async (kind: 'resume' | 'scholarship') => {
    setBusy(kind);
    setError('');
    const res = await fetch(`/api/vol/records/${recordId}/blurb`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(null);
    if (!res?.ok || !data?.text) return setError(data?.error ?? 'No connection. Try again.');
    setText(data.text);
    setSource(data.source);
  };

  return (
    <div className={s.paneStack}>
      <p className={s.paneText}>A line for a resume or a sentence for a scholarship essay, written from this record’s facts.</p>
      <div className={s.kinds}>
        <button type="button" className="btn" disabled={!!busy} onClick={() => draft('resume')}>
          {busy === 'resume' ? 'Writing…' : 'Resume line'}
        </button>
        <button type="button" className="btn" disabled={!!busy} onClick={() => draft('scholarship')}>
          {busy === 'scholarship' ? 'Writing…' : 'Scholarship sentence'}
        </button>
      </div>
      {busy && (
        <p className={s.paneFine} role="status">
          This can take up to 30 seconds.
        </p>
      )}
      {text && (
        <>
          <div className="field">
            <label htmlFor={id}>Your draft</label>
            <textarea id={id} className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => copy(text, 'Text')}>
            <Icon name="copy" size={16} /> Copy
          </button>
          <p className={s.paneFine}>
            Hours from {orgName}’s attested record. {source === 'template' ? 'This is a plain template; edit it before you use it.' : 'The wording is AI-drafted; edit it before you use it.'}
          </p>
        </>
      )}
      {error && (
        <p className="notice notice-red small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
