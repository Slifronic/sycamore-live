import { CtaBand, Facts, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { CardGrid, MiniCard } from '@/components/site/Feature';
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
        lede="Organizations pay for more events and more coordinators. Volunteers, and anyone checking a record, never pay."
        ambient
      />
      <section className={p.plans} aria-label="Plans">
        <div className={p.plansWrap}>
          <PricingTable />
          <p className={p.planNote}>Planned pricing. SycaMore Live is a student demo: nothing is charged and there’s no checkout.</p>
        </div>
      </section>

      <Section id="volunteers" well label="What volunteers pay">
        <Reveal className={p.zero}>
          <p className={p.zeroNum}>
            $0<small>for volunteers, on every plan</small>
          </p>
          <div className={p.zeroText}>
            <h2 className={ss.h3}>Volunteers and reviewers never pay.</h2>
            <Facts
              items={[
                'Check-in, hours, share links, badges and Discover cost volunteers nothing.',
                'A school, scholarship committee or employer opens a record with no account and no fee.',
                'A verified record stays checkable at its link, whatever plan the organization is on.',
              ]}
            />
          </div>
        </Reveal>
      </Section>

      <Section id="included" eyebrow="On every plan" title="Trust isn’t a paid feature.">
        <CardGrid cols={3}>
          <MiniCard icon="check" title="The same record">
            <p>Captured hours from the scans, the organization’s attestation and a public link, on Free as on Multi-site.</p>
          </MiniCard>
          <MiniCard icon="shield" title="The same rules">
            <p>Reasons for every change, read-only after verifying, revocation that shows on the link, and the protections for minors.</p>
          </MiniCard>
          <MiniCard icon="download" title="Your data, always">
            <p>CSV exports of your own events, and volunteers can download or delete theirs at any time.</p>
          </MiniCard>
        </CardGrid>
      </Section>

      <Section id="questions" label="Pricing questions">
        <div className={p.pricingFaq}>
          <Reveal className={ss.headText}>
            <p className={ss.eyebrow}>Questions</p>
            <h2 className={ss.h2}>About cost.</h2>
            <TextLink href="/faq">All questions</TextLink>
          </Reveal>
          <FaqList items={FAQ.filter((q) => PRICING_QS.includes(q.id))} />
        </div>
      </Section>

      <CtaBand title="Start on Free. Upgrade when the calendar fills up." />
    </>
  );
}
