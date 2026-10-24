import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { recordByCode } from '@/lib/vol-data';
import { fmtHours } from '@/lib/hours';
import { ROLE_LABEL } from '@/lib/types';
import { RecordWording, longDate } from '@/components/vol/RecordWording';
import s from './verify.module.css';

// Contract: the public verification page. No cookie, no login, not indexed.
// The bar: someone who has never heard of SycaMore can say who is making the
// claim and who to call. Unknown codes are a plain 404.

export async function generateMetadata({ params }: PageProps<'/v/[code]'>): Promise<Metadata> {
  const r = await recordByCode((await params).code);
  return {
    title: r ? `Service record · ${r.org.name}` : 'No record with this code · SycaMore Live',
    robots: { index: false, follow: false },
  };
}

const pacificDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

export default async function VerifyPage({ params }: PageProps<'/v/[code]'>) {
  await connection();
  const r = await recordByCode((await params).code);
  if (!r) notFound();
  const ok = r.status === 'active';

  return (
    <main className={s.page}>
      <div className={s.inner}>
        <p className={s.brand}>
          <span aria-hidden>❦</span> SycaMore Live · record check
        </p>
        <section className={`${s.banner} ${ok ? s.ok : s.bad}`} role="status">
          <strong>{ok ? `VERIFIED · issued by ${r.org.name}` : 'REVOKED'}</strong>
          <span>{ok ? `Confirmed when the organization closed the event on ${pacificDay(r.attested_at)}.` : `${r.org.name} has withdrawn this record. Contact them for details.`}</span>
        </section>

        <article className={s.card}>
          <p className={s.eyebrow}>Service record {r.code}</p>
          <h1 className={s.title}>{r.volunteer_name}</h1>
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
                <span>{longDate(r.event.date)}{r.event.location ? ` · ${r.event.location}` : ''}</span>
              </dd>
            </div>
          </dl>
          <RecordWording r={r} className={s.wording} fineClassName={s.fine} />
          <div className={s.hoursSplit}>
            <p>
              <b>Captured:</b> {fmtHours(r.hours_captured)} hours from check-in and check-out.
            </p>
            <p>
              <b>Adjusted:</b> {r.hours_adjusted == null ? 'No change by the coordinator.' : `to ${fmtHours(r.hours_adjusted)} hours by ${r.adjusted_by}, with the reason “${r.adjustment_reason}”.`}
            </p>
          </div>
        </article>

        <section className={s.card}>
          <h2 className={s.h2}>Questions about this service</h2>
          <p>
            {r.org.name}
            <br />
            <a href={`tel:${r.org.contact_phone.replace(/[^\d+]/g, '')}`}>{r.org.contact_phone}</a>
            <br />
            <a href={`mailto:${r.org.contact_email}`}>{r.org.contact_email}</a>
          </p>
          <p className={s.fine}>
            The organization is the one making this statement. SycaMore Live is the tool it used to record check-in and check-out times; the volunteer cannot type or edit hours.
          </p>
        </section>

        <p className={s.foot}>
          <Link href="/">What is SycaMore Live?</Link>
        </p>
      </div>
    </main>
  );
}

export const instant = false;
