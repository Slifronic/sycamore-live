'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CopyField } from '@/components/events/CopyField';
import s from '../badges.module.css';

// The badge's public verification link: made on request (POST
// /api/vol/badges/:id/share), never for a minor. The server refuses minors too.
export function BadgeSharePanel({ awardId, url, qrSvg, isMinor }: { awardId: string; url: string | null; qrSvg: string | null; isMinor: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justMade, setJustMade] = useState(false);
  const reveal = (i: number) =>
    justMade ? { initial: { opacity: 0, y: 10, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.5, delay: 0.08 + i * 0.12, ease: [0.16, 1, 0.3, 1] as const } } : {};

  return (
    <section className="card card-pad stack">
      <h3>Public verification link</h3>
      {isMinor ? (
        <p className="notice notice-amber">Sharing needs a guardian’s OK. That’s coming after the hackathon; until then your badge stays private to you.</p>
      ) : url ? (
        <>
          {justMade ? (
            <motion.p className="notice notice-green small" role="status" {...reveal(0)}>
              ✓ Your verification link is ready.
            </motion.p>
          ) : (
            <p className="small muted">Anyone with this link sees who signed the badge, when, and who to call. No account needed.</p>
          )}
          <motion.div {...reveal(1)}>
            <CopyField label="Verification link" value={url} />
          </motion.div>
          {qrSvg && (
            <motion.div className={s.qr} role="img" aria-label="QR code for the verification link" dangerouslySetInnerHTML={{ __html: qrSvg }} {...reveal(2)} />
          )}
          <motion.a className="btn" href={url} target="_blank" rel="noopener" {...reveal(3)}>
            Open the public page ↗
          </motion.a>
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
              setJustMade(true);
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
