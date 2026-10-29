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
// a bottom sheet on phones). Volunteers under 18 can't share yet (there's no
// guardian sign-off flow), so for them Share is a locked secondary button with
// the reason under its label, Use this record is the primary, and the locked
// sheet gives the real next steps: an hour letter from the coordinator, or a
// printed copy. The API refuses minors too.

type Sheet = 'share' | 'use' | null;

/** lucide "lock" at the shared 1.5 stroke; the icon set has no lock. */
function LockGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={s.actionIcon}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.warning('Couldn’t copy', { body: 'Select the text and copy it yourself.' });
  }
}

type Props = { recordId: string; url: string | null; qrSvg: string | null; isMinor: boolean; revoked: boolean; orgName: string; orgPhone: string };

export function RecordActions(props: Props) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const locked = props.isMinor && !props.revoked;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (sheet && !d.open) d.showModal();
    if (!sheet && d.open) d.close();
  }, [sheet]);

  const title = sheet === 'use' ? 'Use this record' : locked ? 'Sharing needs a parent or guardian’s OK' : 'Share this record';

  return (
    <>
      <div className={`${s.below} no-print`}>
        <button type="button" className={`btn btn-quiet ${s.print}`} onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>

      {/* The tray: opaque paper, flush on the phone tab bar (sticky at
          --tabbar-h), so the certificate never shows through or under it. */}
      <div className={`${s.actionBar} no-print`} data-single={props.revoked || undefined}>
        {locked ? (
          <button type="button" className={`btn ${s.action} ${s.lockedAction}`} onClick={() => setSheet('share')} aria-haspopup="dialog" aria-describedby={`${titleId}-why`}>
            <LockGlyph />
            <span className={s.actionText}>
              Share
              <span id={`${titleId}-why`} className={s.actionWhy}>
                Needs a guardian’s OK
              </span>
            </span>
          </button>
        ) : (
          <button type="button" className={`btn btn-primary ${s.action}`} onClick={() => setSheet('share')} aria-haspopup="dialog">
            <Icon name="share" size={20} className={s.actionIcon} /> Share
          </button>
        )}
        {!props.revoked && (
          <button type="button" className={`btn ${locked ? 'btn-primary' : ''} ${s.action}`} onClick={() => setSheet('use')} aria-haspopup="dialog">
            <Icon name="copy" size={20} className={s.actionIcon} /> Use this record
          </button>
        )}
      </div>

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
            {locked && sheet === 'share' && (
              <span className={s.lockedIcon} aria-hidden>
                <LockGlyph />
              </span>
            )}
            <h2 id={titleId} className={s.sheetTitle}>
              {title}
            </h2>
            <button type="button" className={s.close} onClick={() => setSheet(null)} aria-label="Close">
              <Icon name="x" size={20} />
            </button>
          </div>
          {sheet === 'share' && (locked ? <LockedPane orgName={props.orgName} orgPhone={props.orgPhone} onUse={() => setSheet('use')} /> : <SharePane {...props} />)}
          {sheet === 'use' && <UsePane recordId={props.recordId} orgName={props.orgName} />}
        </div>
      </dialog>
    </>
  );
}

// Under 18: the reason sits right under the sheet's title, then what they can
// actually do today: ask a parent or guardian to approve sharing (Transcript page), or print.
function LockedPane({ orgName, orgPhone, onUse }: { orgName: string; orgPhone: string; onUse: () => void }) {
  return (
    <div className={s.paneStack}>
      <p className={s.lockedWhy}>You’re under 18, so a public link needs a parent or guardian’s OK first. The record itself is safe here.</p>
      <ol className={s.steps}>
        <li>
          <b>Ask a parent or guardian to approve sharing.</b>
          <span>
            We email them a link to approve. Once they do, you can share this record and your whole transcript.{' '}
            <a href="/me/transcript#guardian">Ask on your Transcript page</a>.
          </span>
        </li>
        <li>
          <b>Ask your coordinator for an hour letter.</b>
          <span>
            {orgName} can print a letter of your attested hours to hand to a school or scholarship committee.
            {orgPhone && (
              <>
                {' '}
                Call <span className={s.nowrap}>{orgPhone}</span>.
              </>
            )}
          </span>
        </li>
        <li>
          <b>Or print this record yourself.</b>
          <span>It prints as the certificate above, with the organization’s contact details.</span>
        </li>
      </ol>
      <div className={s.kinds}>
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn" onClick={onUse}>
          Use this record
        </button>
      </div>
    </div>
  );
}

function SharePane({ recordId, url, qrSvg, revoked }: { recordId: string; url: string | null; qrSvg: string | null; revoked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (revoked) return <p className="notice notice-red">The organization revoked this record, so it can’t be shared. Ask them why.</p>;
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
          <Icon name="copy" size={16} className={s.actionIcon} /> Copy
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
            <Icon name="copy" size={16} className={s.actionIcon} /> Copy
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
