import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { recordByCode } from '@/lib/vol-data';
import { fmtHours } from '@/lib/hours';
import { initials } from '@/lib/format';
import { appUrl } from '@/lib/event-intake';
import { ROLE_LABEL } from '@/lib/types';
import { RecordWording, longDate } from '@/components/vol/RecordWording';
import { Seal } from '@/components/media/Seal';
import { HoursBar } from '@/components/media/HoursBar';
import { Leaf } from '@/components/media/Leaf';
import { PrintButton } from '@/app/org/(app)/reports/PrintButton';
import s from './verify.module.css';

// Contract: the public verification page. No cookie, no login, not indexed.
// The bar: someone who has never heard of SycaMore can say who is making the
// claim and who to call. Unknown codes are a plain 404.
//
// Set like a certificate on paper: the organization's statement, a seal that
// stamps in once, captured vs attested hours, then who to call.

export async function generateMetadata({ params }: PageProps<'/v/[code]'>): Promise<Metadata> {
  const r = await recordByCode((await params).code);
  if (!r) return { title: 'No record with this code', robots: { index: false, follow: false } };
  const title = r.status === 'active' ? `${r.volunteer_name} · ${fmtHours(r.hours_total)} verified hours` : `${r.volunteer_name} · record revoked`;
  const description = `${r.org.name} ${r.status === 'active' ? 'verified' : 'has withdrawn'} this service record: ${r.event.title}, ${longDate(r.event.date)}.`;
  return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image', title, description }, robots: { index: false, follow: false } };
}

const pacificDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

export default async function VerifyPage({ params }: PageProps<'/v/[code]'>) {
  await connection();
  const r = await recordByCode((await params).code);
  if (!r) notFound();
  const ok = r.status === 'active';
  const tel = r.org.contact_phone.replace(/[^\d+]/g, '');

  return (
    <main className={s.page}>
      <div className={s.inner}>
        <header className={`${s.top} no-print`}>
          <Link href="/" className={s.brand}>
            <Leaf size={20} color="var(--canopy)" veins={null} /> SycaMore Live <span className={s.brandSub}>· record check</span>
          </Link>
          <PrintButton label="Print" className="btn btn-quiet btn-sm" />
        </header>

        <section className={`${s.banner} ${ok ? s.ok : s.bad}`} role="status">
          <span className={s.bannerDot} aria-hidden />
          <span>
            <strong>{ok ? `Verified · issued by ${r.org.name}` : `Revoked · ${r.org.name} has withdrawn this record`}</strong>
            <span>{ok ? `Confirmed when the organization closed the event on ${pacificDay(r.attested_at)}.` : 'It no longer counts as a record of service. Contact the organization for details.'}</span>
          </span>
        </section>

        <article className={`${s.sheet} ${ok ? "" : s.sheetRevoked} force-light`} aria-labelledby="rec-name">
          <Seal state={ok ? 'verified' : 'revoked'} size={112} className={s.seal} />
          <div className={s.sheetHead}>
            <p className={s.eyebrow}>
              Service record · <span className={s.code}>{r.code}</span>
            </p>
            <h1 id="rec-name" className={s.title}>
              {r.volunteer_name}
            </h1>
          </div>
          <dl className={s.facts}>
            <div>
              <dt>Hours</dt>
              <dd className={s.big}>{fmtHours(r.hours_total)}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{ROLE_LABEL[r.role]}</dd>
            </div>
            <div>
              <dt>Event</dt>
              <dd>
                {r.event.title}
                <span>
                  {longDate(r.event.date)}
                  {r.event.location ? ` · ${r.event.location}` : ''}
                </span>
              </dd>
            </div>
          </dl>
          <RecordWording r={r} className={s.wording} fineClassName={s.fine} />
          <div className={s.bars}>
            <HoursBar captured={r.hours_captured} attested={r.hours_total} adjustedBy={r.adjusted_by} reason={r.adjustment_reason} />
          </div>
          <div className={s.sign}>
            <span className={s.signLine}>{r.org.name}</span>
            <span className={s.signSub}>Issuer · attested {pacificDay(r.attested_at)}</span>
          </div>
        </article>

        <section className={`${s.issuer}`} aria-labelledby="issuer">
          <span className={s.tile} aria-hidden>
            {initials(r.org.name)}
          </span>
          <div className={s.issuerText}>
            <p className={s.eyebrow}>Questions about this service</p>
            <h2 id="issuer" className={s.h2}>
              {r.org.name}
            </h2>
            <p className={s.fine}>The organization is the one making this statement. Call or write to it to confirm any detail.</p>
            <div className={s.contact}>
              <a className="btn btn-sm" href={`tel:${tel}`}>
                Call {r.org.contact_phone}
              </a>
              <a className="btn btn-sm btn-quiet" href={`mailto:${r.org.contact_email}?subject=${encodeURIComponent(`Service record ${r.code}`)}`}>
                {r.org.contact_email}
              </a>
            </div>
          </div>
        </section>

        <details className={`${s.how} no-print`}>
          <summary>How to read this record</summary>
          <dl className={s.howList}>
            <div>
              <dt>Who says so</dt>
              <dd>{r.org.name} makes this statement. SycaMore Live is the tool it used to record check-in and check-out times; it did not watch the work.</dd>
            </div>
            <div>
              <dt>Captured vs attested</dt>
              <dd>Captured hours come from the volunteer scanning in and out. Attested hours are what the coordinator signed when closing the event. Any change between the two is shown with its reason.</dd>
            </div>
            <div>
              <dt>Verified or revoked</dt>
              <dd>Verified means the organization still stands behind the record. If it withdraws the record, this page says Revoked in red; the link never silently disappears.</dd>
            </div>
            <div>
              <dt>Can the volunteer edit it?</dt>
              <dd>No. Volunteers never type hours, and attested rows are locked in the database. Only the organization can withdraw a record.</dd>
            </div>
            <div>
              <dt>This code</dt>
              <dd>{r.code} is unique to this record. A printout is a copy; this page, at this address, is the proof.</dd>
            </div>
          </dl>
        </details>

        <p className={`${s.foot} no-print`}>
          <Link href="/">What is SycaMore Live?</Link>
        </p>
        <p className={s.printFoot}>Verify this record at {appUrl().replace(/^https?:\/\//, '')}/v/{r.code}</p>
      </div>
    </main>
  );
}

export const instant = false;
