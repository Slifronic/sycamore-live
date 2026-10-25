import { CtaBand, PageHero, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { FAQ, FaqList } from '@/components/site/Faq';
import { pageMeta } from '@/components/site/meta';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'FAQ',
  'Straight answers about SycaMore Live: cost, forgotten check-outs, inflated hours, what schools see, minors, AI, location and paper sheets.',
  '/faq',
);

export default function Faq() {
  return (
    <>
      <PageHero eyebrow="FAQ" title={['Questions,', <em key="e">answered plainly.</em>]} lede="Short answers. The long ones live in How it works and Trust." />
      <section className={p.faqSection} aria-label="Questions and answers">
        <div className={`${ss.wrap} ${p.faqGrid}`}>
          <aside className={p.faqAside}>
            <p className={ss.eyebrow}>Still curious?</p>
            <TextLink href="/how-it-works">How it works</TextLink>
            <TextLink href="/trust">How the record works</TextLink>
            <TextLink href="/privacy">Privacy</TextLink>
          </aside>
          <FaqList items={FAQ} />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
