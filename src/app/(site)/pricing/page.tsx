import { CtaBand, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { Chips } from '@/components/site/Chips';
import { FAQ, FaqList } from '@/components/site/Faq';
import { PricingTable } from '@/components/site/PricingTable';
import { Reveal } from '@/components/site/Reveal';
import { pageMeta } from '@/components/site/meta';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'Pricing',
  'Planned pricing for organizations: Free, Core, Program and Multi-site. Volunteers are always free, and nothing is charged during the demo.',
  '/pricing',
);

const PRICING_QS = ['free', 'signup', 'company'];

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={['Free to start.', <em key="e">Always free for volunteers.</em>]}
        lede="Organizations pay for more events and coordinators. Nobody pays to check a record."
        motif="seed"
      />
      <section className={p.plans} aria-label="Plans">
        <div className={p.plansWrap}>
          <PricingTable />
          <p className={p.planNote}>Planned pricing. A student demo: nothing is charged, no checkout.</p>
        </div>
      </section>

      <Section id="volunteers" well label="What volunteers pay">
        <Reveal className={p.zero}>
          <p className={p.zeroNum}>
            $0<small>for volunteers and reviewers, on every plan</small>
          </p>
          <div className={p.zeroText}>
            <h2 className={ss.h3}>Trust isn’t a paid feature.</h2>
            <p className={ss.body}>Free gets the same record and the same rules as Multi-site.</p>
            <Chips items={['Scanned hours', 'Reasons for every change', 'Locked once verified', 'Revocable links', 'Protections for minors', 'Your data, exportable']} />
          </div>
        </Reveal>
      </Section>

      <Section id="questions" label="Pricing questions">
        <div className={p.pricingFaq}>
          <Reveal className={ss.headText}>
            <p className={ss.eyebrow}>Questions</p>
            <h2 className={ss.h2}>About cost.</h2>
            <TextLink href="/faq">All questions</TextLink>
          </Reveal>
          <FaqList items={FAQ.filter((q) => PRICING_QS.includes(q.id))} openFirst={false} />
        </div>
      </Section>

      <CtaBand title="Start on Free. Upgrade when the calendar fills up." text="No card, no trial clock." />
    </>
  );
}
