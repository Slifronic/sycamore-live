import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { hourRequestByToken } from '@/lib/transcript';
import { fmtHours } from '@/lib/hours';
import { PublicFrame } from '@/components/site/PublicFrame';
import { ConfirmForm } from './ConfirmForm';
import s from './confirm.module.css';

export const metadata: Metadata = { title: 'Confirm volunteer hours', robots: { index: false, follow: false }, referrer: 'no-referrer' };

// A supervisor at an organization not on SycaMore confirms, corrects or
// declines a volunteer's hours from the link in their email. No account.

export default async function ConfirmPage({ params }: PageProps<'/confirm/[token]'>) {
  await connection();
  const { token } = await params;
  const r = await hourRequestByToken(token);
  if (!r) notFound();
  const day = new Date(`${r.served_on}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return (
    <PublicFrame width={560} note="SycaMore Live records volunteer hours as they happen.">
      <div className={`${s.box} rise`}>
        <p className={s.eyebrow}>Volunteer hours to confirm</p>
        <h1 className={s.title}>
          {r.volunteer} · {fmtHours(r.hours)} hours
        </h1>
        <dl className={s.facts}>
          <div>
            <dt>Organization</dt>
            <dd>{r.org_name}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{day}</dd>
          </div>
          <div>
            <dt>What they did</dt>
            <dd>“{r.description}”</dd>
          </div>
        </dl>
        {r.status !== 'pending' ? (
          <p className="notice" role="status">
            This has already been answered ({r.status}). Thank you.
          </p>
        ) : r.expired ? (
          <p className="notice notice-amber">This link has expired. {r.volunteer} can send you a new one.</p>
        ) : (
          <ConfirmForm token={token} hours={r.hours} contactName={r.contact_name} volunteer={r.volunteer} />
        )}
      </div>
    </PublicFrame>
  );
}

// Reads the session cookie or a token from the URL, so it renders per request.
export const instant = false;
