import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { requireOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { fmtDay, fmtTime } from '@/lib/format';
import { PrintButton } from '../../../reports/PrintButton';
import { ensureWalkinToken, walkinWindow } from '@/lib/walkin';
import { walkinUrl } from '@/lib/walkin-panel';
import s from './sign.module.css';

// A one-page sign to tape to the sign-in table, for when there's no screen to
// prop up. Same QR and code as the event-day screen.
export default async function SignPage({ params }: PageProps<'/org/events/[id]/sign'>) {
  const org = await requireOrg();
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) notFound();
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/checkin?code=${event.checkin_code}`;
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } });
  // Page 2: the walk-in sign-up code, for people who have never signed up.
  const walkinToken = event.is_practice || event.attested_at || !event.walkin_open ? null : await ensureWalkinToken(org.id, id);
  const walkinQr = walkinToken
    ? await QRCode.toString(walkinUrl(walkinToken), { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } })
    : null;
  const { opens, closes } = walkinWindow(event);

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 760 }}>
      <div className="row between no-print">
        <p className="muted small">Print this and tape it to the sign-in table. Letter size, portrait.</p>
        <PrintButton label="Print sign" />
      </div>
      <article className={s.sign}>
        <p className={s.org}>{org.name}</p>
        <h1 className={s.title}>Check in here</h1>
        <p className={s.event}>
          {event.title} · {fmtDay(event.starts_at)}, {fmtTime(event.starts_at)}
        </p>
        <div className={s.qr} dangerouslySetInnerHTML={{ __html: qr }} />
        <ol className={s.steps}>
          <li>Open your phone camera and point it at the code.</li>
          <li>Tap the link and enter your name.</li>
          <li>Scan again when you leave, so your hours count.</li>
        </ol>
        <p className={s.code}>
          No camera? Go to <strong>{url.replace(/^https?:\/\//, '').split('?')[0]}</strong> and type <strong className={s.mono}>{event.checkin_code}</strong>
        </p>
        <p className={s.foot}>No phone at all? Tell {org.coordinator_name}. Your hours still count.</p>
      </article>
      {walkinQr && (
        <article className={`${s.sign} ${s.second}`}>
          <p className={s.org}>{org.name}</p>
          <h1 className={s.title}>First time here?</h1>
          <p className={s.event}>
            {event.title} · {fmtDay(event.starts_at)}, {fmtTime(event.starts_at)}
          </p>
          <div className={s.qr} dangerouslySetInnerHTML={{ __html: walkinQr }} />
          <ol className={s.steps}>
            <li>Point your phone camera at the code.</li>
            <li>Sign up with Google or your name, email and birth date.</li>
            <li>You’re checked in. Tap Check out on the same page when you leave.</li>
          </ol>
          <p className={s.foot}>
            This code works only for this event, from {fmtTime(opens)} to {fmtTime(closes)}. Already signed up? Use the other sign.
          </p>
        </article>
      )}
    </div>
  );
}

export const instant = false;
