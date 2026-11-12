import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CONTACT_EMAIL } from '@/components/site/Legal';
import { clip, pageMeta } from '@/components/site/meta';
import { Icon } from '@/components/shell/icons';
import { appUrl } from '@/lib/event-intake';
import { CATEGORY_LABEL, ageLabel, checkedLabel, cityKey, opportunityBySlug } from '@/lib/opportunities';
import s from '../opportunities.module.css';

// One public listing: what it is, when, where, who can come, and a button to
// the organization's own page. SycaMore records nothing here, and says so.
// An unknown or hidden slug is a 404.

// Where "report a broken link" goes: the site's contact address when one is
// published, else the address the organization settings page already uses.
const REPORT_EMAIL = CONTACT_EMAIL ?? 'review@sycamore.app';

export async function generateMetadata({ params }: PageProps<'/opportunities/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const o = await opportunityBySlug(slug);
  if (!o) return { title: 'Opportunity not found', robots: { index: false, follow: false } };
  return pageMeta(`${o.title} · ${o.org_name}`, clip(`${o.summary} A public listing; the link goes to ${o.org_name}’s own page.`), `/opportunities/${o.slug}`);
}

export default async function OpportunityPage({ params }: PageProps<'/opportunities/[slug]'>) {
  await connection();
  const { slug } = await params;
  const o = await opportunityBySlug(slug);
  if (!o) notFound();

  const report = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Broken link: ${o.title} (${o.org_name})`)}&body=${encodeURIComponent(
    `The link on ${appUrl()}/opportunities/${o.slug} doesn’t work.\n\nWhat happened:\n`,
  )}`;
  const where = o.remote ? (cityKey(o.city) === 'remote' ? 'From home' : `From home · ${o.city}`) : o.city;

  return (
    <article className={s.detail}>
      <div className={s.detailInner}>
        <Link href="/opportunities" className={s.back}>
          <Icon name="arrow-right" size={16} /> All opportunities
        </Link>

        <p className={s.kind}>
          <span className="chip chip-ink">Public listing</span>
          <span className={s.cat}>{CATEGORY_LABEL[o.category]}</span>
        </p>
        <h1 className={s.detailTitle}>{o.title}</h1>
        <p className={s.detailOrg}>
          {o.org_url ? (
            <a href={o.org_url} target="_blank" rel="noopener nofollow">
              {o.org_name}
            </a>
          ) : (
            o.org_name
          )}
        </p>
        <p className={s.detailSummary}>{o.summary}</p>

        <div className={s.factsCard}>
          <dl className={s.facts}>
            <div>
              <dt>Where</dt>
              <dd>{where}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{o.schedule ?? 'Not listed. See their page.'}</dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>
                {ageLabel(o.min_age)}
                {o.min_age_note && <small>{o.min_age_note}</small>}
              </dd>
            </div>
            <div>
              <dt>Groups</dt>
              <dd>{o.group_friendly === null ? 'Not listed' : o.group_friendly ? 'Groups welcome' : 'Individuals only'}</dd>
            </div>
          </dl>
        </div>

        <p className={s.honest}>
          <Icon name="info" size={20} />
          <span>
            SycaMore doesn’t record hours here unless {o.org_name} uses it. Sign up, and ask for proof of your hours, on their page.
          </span>
        </p>

        <div className={s.out}>
          <div className={s.outRow}>
            {/* A plain link, never <Link>: a prefetch would count as a click. */}
            <a href={`/opportunities/go/${o.slug}`} className="btn btn-primary btn-big" target="_blank" rel="noopener nofollow" aria-label={`Go to ${o.org_name}’s page (opens in a new tab)`}>
              Go to their page <Icon name="external" size={20} />
            </a>
          </div>
          <p className={s.report}>
            Link checked {checkedLabel(o.verified_on)}. <a href={report}>Report a broken link</a>
          </p>
        </div>

        <p className={s.runIt}>
          <span>Run this program?</span>
          <Link href="/org/start">Record these hours on SycaMore</Link>
        </p>
      </div>
    </article>
  );
}

// Reads the slug from the URL and 404s on an unknown one, so it renders per request.
export const instant = false;
