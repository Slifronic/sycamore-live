import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { guardianRequest } from '@/lib/transcript';
import { PublicFrame } from '@/components/site/PublicFrame';
import { GuardianDecision } from './GuardianDecision';
import s from '../../confirm/[token]/confirm.module.css';

export const metadata: Metadata = { title: 'Approve sharing volunteer hours', robots: { index: false, follow: false }, referrer: 'no-referrer' };

// A parent or guardian of a 13 to 17 year old approves (or withdraws) sharing,
// from the link in their email. The same link turns it back off later.

export default async function GuardianPage({ params }: PageProps<'/guardian/[token]'>) {
  await connection();
  const { token } = await params;
  const r = await guardianRequest(token);
  if (!r) notFound();
  const first = r.name.split(' ')[0];
  return (
    <PublicFrame width={560} note="SycaMore Live records volunteer hours as they happen.">
      <div className={`${s.box} rise`}>
        <p className={s.eyebrow}>For a parent or guardian</p>
        <h1 className={s.title}>Can {first} share their volunteer hours?</h1>
        <p>
          {r.name} volunteers with organizations that record hours on SycaMore. Sharing gives them a link to send to a school, scholarship or club. It
          shows:
        </p>
        <ul className={s.facts} style={{ paddingLeft: 20 }}>
          <li>their name, the organizations, dates, roles and hours</li>
          <li>who confirmed each entry</li>
        </ul>
        <p className="muted">
          It never shows their email, birth date, messages or location. Under 18s also can’t receive direct messages on SycaMore, only announcements.
        </p>
        {r.expired && !r.decided_at ? (
          <p className="notice notice-amber">This link has expired. Ask {first} to send a new one.</p>
        ) : (
          <GuardianDecision token={token} first={first!} approved={r.decided_at ? !!r.approved : null} />
        )}
      </div>
    </PublicFrame>
  );
}

// Reads the session cookie or a token from the URL, so it renders per request.
export const instant = false;
