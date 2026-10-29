import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { transcriptByCode } from '@/lib/transcript';
import { fmtHours } from '@/lib/hours';
import { PublicFrame } from '@/components/site/PublicFrame';
import { TranscriptView } from '@/components/vol/TranscriptView';
import { PrintButton } from '@/app/org/(app)/reports/PrintButton';
import s from './transcript-page.module.css';

// The public service transcript. No cookie, no login, not indexed. Shows the
// name, organizations, dates, roles and hours, and for every line who vouched
// for it and how. Never an email, birth date or message. Unknown, withdrawn
// or guardian-revoked links are a plain 404.

export async function generateMetadata({ params }: PageProps<'/t/[code]'>): Promise<Metadata> {
  const t = await transcriptByCode((await params).code);
  if (!t) return { title: 'No transcript with this link', robots: { index: false, follow: false } };
  const title = `${t.name} · ${fmtHours(t.hours.total)} hours of confirmed service`;
  const description = `Volunteer service across ${t.orgs.length} ${t.orgs.length === 1 ? 'organization' : 'organizations'}, each hour attested by the organization or confirmed by a supervisor.`;
  return { title, description, openGraph: { title, description }, robots: { index: false, follow: false } };
}

export default async function TranscriptPublicPage({ params }: PageProps<'/t/[code]'>) {
  await connection();
  const t = await transcriptByCode((await params).code);
  if (!t) notFound();
  const asOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
  return (
    <PublicFrame note="SycaMore Live records volunteer hours as they happen. Organizations attest them; SycaMore never adds hours of its own.">
      <article className={`${s.sheet} rise`}>
        <header className={s.head}>
          <div>
            <p className={s.eyebrow}>
              Service transcript · <span className={s.code}>{t.code}</span>
            </p>
            <h1 className={s.name}>{t.name}</h1>
            <p className={s.asof}>Live as of {asOf}. Every line says who confirmed it.</p>
          </div>
          <PrintButton label="Print" className="btn btn-quiet btn-sm no-print" />
        </header>
        <TranscriptView t={t} />
        <details className={`${s.how} no-print`}>
          <summary>How to read this</summary>
          <ul>
            <li>
              <strong>Scanned in and out</strong>: the volunteer checked in and out with the event’s QR code, and the organization’s coordinator
              verified the hours after the event. Every changed hour carries a reason, and verified hours can’t be edited.
            </li>
            <li>
              <strong>Confirmed by email</strong>: the volunteer served somewhere not on SycaMore and named a supervisor, who confirmed the date and
              hours from a link sent to their email, with their name and role. The volunteer can’t confirm their own hours.
            </li>
            <li>Single records link to their own page, with the organization’s phone and email if you want to check a detail.</li>
          </ul>
        </details>
      </article>
    </PublicFrame>
  );
}

// Reads the session cookie or a token from the URL, so it renders per request.
export const instant = false;
