import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { badgeByCode } from '@/lib/vol-badges';
import { initials } from '@/lib/format';
import { appUrl } from '@/lib/event-intake';
import { BadgeEmblem } from '@/components/vol/BadgeEmblem';
import { Seal } from '@/components/media/Seal';
import { Leaf } from '@/components/media/Leaf';
import { PrintButton } from '@/app/org/(app)/reports/PrintButton';
import s from '../../[code]/verify.module.css';
import { OG_IMAGE, clip } from '@/components/site/meta';

// Public badge check, the badge twin of /v/<code>: no cookie, no login, not
// indexed. It shows who signed the badge, when, the coordinator's evidence note
// and who to call. Unknown codes are a plain 404.

export async function generateMetadata({ params }: PageProps<'/v/b/[code]'>): Promise<Metadata> {
  const b = await badgeByCode((await params).code);
  if (!b) return { title: 'No badge with this code', robots: { index: false, follow: false } };
  const title = `${b.volunteer_name} · ${b.def.name} badge`;
  const description = clip(`${b.def.name} badge for ${b.volunteer_name}, signed by ${b.signed_by} at ${b.org.name}. Anyone with this link can check it, and nobody can edit it.`);
  return {
    title,
    description,
    openGraph: { title, description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE] },
    robots: { index: false, follow: false },
  };
}

const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

export default async function BadgeVerifyPage({ params }: PageProps<'/v/b/[code]'>) {
  await connection();
  const b = await badgeByCode((await params).code);
  if (!b) notFound();
  const tel = b.org.contact_phone.replace(/[^\d+]/g, '');

  return (
    <main className={s.page}>
      <div className={s.inner}>
        <header className={`${s.top} no-print`}>
          <Link href="/" className={s.brand}>
            <Leaf size={20} color="var(--canopy)" veins={null} /> SycaMore Live <span className={s.brandSub}>· badge check</span>
          </Link>
          <PrintButton label="Print" className="btn btn-quiet btn-sm" />
        </header>

        <section className={`${s.banner} ${s.ok}`} role="status">
          <span className={s.bannerDot} aria-hidden />
          <span>
            <strong>Verified · signed by {b.org.name}</strong>
            <span>
              {b.signed_by} signed this badge on {longDay(b.signed_at)}.
            </span>
          </span>
        </section>

        <article className={`${s.sheet} force-light`} aria-labelledby="badge-name">
          <Seal state="verified" label="Signed badge · verified by the organization · " size={112} className={s.seal} />
          <div className={s.sheetHead}>
            <p className={s.eyebrow}>
              Badge · <span className={s.code}>{b.code}</span>
            </p>
            <h1 id="badge-name" className={s.title}>
              {b.volunteer_name}
            </h1>
          </div>
          <div className={s.badgeRow}>
            <span className={s.sheen}>
              <BadgeEmblem badge={b.def.key} state="signed" size="lg" />
            </span>
            <dl className={s.facts} style={{ borderTop: 0, borderBottom: 0, padding: 0 }}>
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
          </div>
          <p className={s.wording}>
            <strong>{b.org.name}</strong> recognizes <strong>{b.volunteer_name}</strong> with the <strong>{b.def.name}</strong> badge for meeting its rule in the attested record.
          </p>
          {b.evidence_note && <blockquote className={s.quote}>What the coordinator saw: “{b.evidence_note}”</blockquote>}
          <p className={s.fine}>
            The rule for this badge: {b.def.rule}. It counts only hours the organization attested, and a coordinator signs every badge by hand.
          </p>
          <div className={s.sign}>
            <span className={s.signLine}>{b.signed_by}</span>
            <span className={s.signSub}>
              for {b.org.name} · {longDay(b.signed_at)}
            </span>
          </div>
        </article>

        <section className={`${s.issuer}`} aria-labelledby="issuer">
          <span className={s.tile} aria-hidden>
            {initials(b.org.name)}
          </span>
          <div className={s.issuerText}>
            <p className={s.eyebrow}>Questions about this badge</p>
            <h2 id="issuer" className={s.h2}>
              {b.org.name}
            </h2>
            <p className={s.fine}>The organization is the one making this statement. SycaMore Live is the tool it used to record the volunteer’s hours; the volunteer cannot issue or edit a badge.</p>
            <div className={s.contact}>
              <a className="btn btn-sm" href={`tel:${tel}`}>
                Call {b.org.contact_phone}
              </a>
              <a className="btn btn-sm" href={`mailto:${b.org.contact_email}?subject=${encodeURIComponent(`Badge ${b.code}`)}`}>
                {b.org.contact_email}
              </a>
            </div>
          </div>
        </section>

        <details className={`${s.how} no-print`}>
          <summary>How to read this badge</summary>
          <dl className={s.howList}>
            <div>
              <dt>Who says so</dt>
              <dd>{b.org.name} signed it. A coordinator signs each badge by hand after the system finds who meets the rule.</dd>
            </div>
            <div>
              <dt>What it counts</dt>
              <dd>Only hours and events the organization attested. Check-ins still waiting for confirmation and practice events never count.</dd>
            </div>
            <div>
              <dt>What it doesn’t claim</dt>
              <dd>A badge states that the rule was met and who signed it. It makes no claim about skills beyond that.</dd>
            </div>
            <div>
              <dt>This code</dt>
              <dd>{b.code} is unique to this badge. A printout is a copy; this page is the proof.</dd>
            </div>
          </dl>
        </details>

        <p className={`${s.foot} no-print`}>
          <Link href="/">What is SycaMore Live?</Link>
        </p>
        <p className={s.printFoot}>
          Verify this badge at {appUrl().replace(/^https?:\/\//, '')}/v/b/{b.code}
        </p>
      </div>
    </main>
  );
}

export const instant = false;
