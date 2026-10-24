'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CopyField } from '@/components/events/CopyField';
import s from '../badges.module.css';

// The badge's public verification link: made on request (POST
// /api/vol/badges/:id/share), never for a minor. The server refuses minors too.
export function BadgeSharePanel({ awardId, url, qrSvg, isMinor }: { awardId: string; url: string | null; qrSvg: string | null; isMinor: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <section className="card card-pad stack">
      <h3>Public verification link</h3>
      {isMinor ? (
        <p className="notice notice-amber">Sharing needs a guardian’s OK. That’s coming after the hackathon; until then your badge stays private to you.</p>
      ) : url ? (
        <>
          <p className="small muted">Anyone with this link sees who signed the badge, when, and who to call. No account needed.</p>
          <CopyField label="Verification link" value={url} />
          {qrSvg && <div className={s.qr} role="img" aria-label="QR code for the verification link" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
          <a className="btn" href={url} target="_blank" rel="noopener">
            Open the public page ↗
          </a>
        </>
      ) : (
        <>
          <p className="small muted">Make a link a school, scholarship committee or employer can open to check this badge. Only people you give it to can see it.</p>
          <button
            className="btn btn-primary btn-big"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              const res = await fetch(`/api/vol/badges/${awardId}/share`, { method: 'POST' }).catch(() => null);
              const data = await res?.json().catch(() => ({}));
              setBusy(false);
              if (!res?.ok) return setError(data?.error ?? 'No connection. Try again.');
              router.refresh();
            }}
          >
            {busy ? 'Making your link…' : 'Create verification link'}
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
