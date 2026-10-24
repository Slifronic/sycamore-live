import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { badgeByCode } from '@/lib/vol-badges';
import s from '../../[code]/verify.module.css';

// Public badge check, the badge twin of /v/<code>: no cookie, no login, not
// indexed. It shows who signed the badge, when, the coordinator's evidence note
// and who to call. Unknown codes are a plain 404.

export async function generateMetadata({ params }: PageProps<'/v/b/[code]'>): Promise<Metadata> {
  const b = await badgeByCode((await params).code);
  return {
    title: b ? `${b.def.name} badge · ${b.org.name}` : 'No badge with this code · SycaMore Live',
    robots: { index: false, follow: false },
  };
}

const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

export default async function BadgeVerifyPage({ params }: PageProps<'/v/b/[code]'>) {
  await connection();
  const b = await badgeByCode((await params).code);
  if (!b) notFound();

  return (
    <main className={s.page}>
      <div className={s.inner}>
        <p className={s.brand}>
          <span aria-hidden>❦</span> SycaMore Live · badge check
        </p>
        <section className={`${s.banner} ${s.ok}`} role="status">
          <strong>VERIFIED · signed by {b.org.name}</strong>
          <span>
            {b.signed_by} signed this badge on {longDay(b.signed_at)}.
          </span>
        </section>

        <article className={s.card}>
          <p className={s.eyebrow}>Badge {b.code}</p>
          <h1 className={s.title}>{b.volunteer_name}</h1>
          <dl className={s.facts}>
            <div>
              <dt>Badge</dt>
              <dd>{b.def.name}</dd>
            </div>
            <div>
              <dt>Issued by</dt>
              <dd>{b.org.name}</dd>
            </div>
            <div>
              <dt>Signed</dt>
              <dd>
                {b.signed_by}
                <span>{longDay(b.signed_at)}</span>
              </dd>
            </div>
          </dl>
          <p className={s.wording}>
            <strong>{b.org.name}</strong> recognizes <strong>{b.volunteer_name}</strong> with the <strong>{b.def.name}</strong> badge for meeting its rule in the attested record.
          </p>
          {b.evidence_note && (
            <p className={s.wording}>
              What the coordinator saw: “{b.evidence_note}”
            </p>
          )}
          <p className={s.fine}>
            The rule for this badge: {b.def.rule}. It counts only hours the organization attested, and a coordinator signs every badge by hand.
          </p>
        </article>

        <section className={s.card}>
          <h2 className={s.h2}>Questions about this badge</h2>
          <p>
            {b.org.name}
            <br />
            <a href={`tel:${b.org.contact_phone.replace(/[^\d+]/g, '')}`}>{b.org.contact_phone}</a>
            <br />
            <a href={`mailto:${b.org.contact_email}`}>{b.org.contact_email}</a>
          </p>
          <p className={s.fine}>
            The organization is the one making this statement. SycaMore Live is the tool it used to record the volunteer’s hours; the volunteer cannot issue or edit a badge.
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
