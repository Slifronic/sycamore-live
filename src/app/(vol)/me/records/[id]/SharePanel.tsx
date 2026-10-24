'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CopyField } from '@/components/events/CopyField';
import s from '../../../pages.module.css';

export function SharePanel({ recordId, url, qrSvg, isMinor, revoked }: { recordId: string; url: string | null; qrSvg: string | null; isMinor: boolean; revoked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <section className="card card-pad stack">
      <h3>Your record, your link</h3>
      {revoked ? (
        <p className="notice notice-red small">The organization revoked this record, so it can’t be shared. Ask them why.</p>
      ) : isMinor ? (
        <p className="notice notice-amber">Sharing needs a guardian’s OK. That’s coming after the hackathon; until then your record stays private to you.</p>
      ) : url ? (
        <>
          <p className="small muted">Anyone with this link sees the organization’s statement and who to call. No account needed.</p>
          <CopyField label="Share link" value={url} />
          {qrSvg && <div className={s.qr} role="img" aria-label="QR code for the share link" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
          <a className="btn" href={url} target="_blank" rel="noopener">
            Open the public page ↗
          </a>
        </>
      ) : (
        <>
          <p className="small muted">Make a link a school or scholarship committee can open to check this record. Only people you give it to can see it.</p>
          <button
            className="btn btn-primary btn-big"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              const res = await fetch(`/api/vol/records/${recordId}/share`, { method: 'POST' }).catch(() => null);
              const data = await res?.json().catch(() => ({}));
              setBusy(false);
              if (!res?.ok) return setError(data?.error ?? 'No connection. Try again.');
              router.refresh();
            }}
          >
            {busy ? 'Making your link…' : 'Create share link'}
          </button>
        </>
      )}
      {error && (
        <p className="notice notice-red small" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
