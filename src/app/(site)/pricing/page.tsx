import type { Metadata } from 'next';
import { CtaBand, PageHero, SectionHead, siteStyles as ss } from '@/components/site/Blocks';
import { CardGrid, MiniCard } from '@/components/site/Feature';
import { PricingTable } from '@/components/site/PricingTable';
import { Reveal } from '@/components/site/Reveal';
import p from '../pages.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Planned pricing for organizations: Free, Core, Program and Multi-site. Volunteers are always free, and nothing is charged during the hackathon demo.',
};

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={['Free to start.', <em key="e">Always free for volunteers.</em>]}
        lede="Organizations pay for more events and more coordinators. Volunteers never pay, and a record stays verifiable even if an organization stops paying."
      />
      <section className={p.block} style={{ paddingTop: 0 }} aria-label="Plans">
        <div className={ss.wrap}>
          <Reveal>
            <PricingTable />
          </Reveal>
          <p className={`${ss.body}`} style={{ textAlign: 'center', marginTop: 28, fontSize: 14 }}>
            This is planned pricing. SycaMore Live is a hackathon demo, nothing is charged, and there’s no checkout.
          </p>
        </div>
      </section>
      <section className={p.block} style={{ paddingTop: 0 }} aria-labelledby="pricing-q">
        <div className={ss.wrap}>
          <SectionHead eyebrow="Fine print, in large type" title="What every plan includes." id="pricing-q" />
          <CardGrid cols={3}>
            <MiniCard title="Volunteers are free">
              <p>Checking in, My hours, share links, badges and Discover cost volunteers nothing, on every plan.</p>
            </MiniCard>
            <MiniCard title="Records outlive the plan">
              <p>A verified record stays checkable at its link forever, whatever plan the organization is on.</p>
            </MiniCard>
            <MiniCard title="The same rules on every plan">
              <p>Reasons for every change, read-only after verifying, minors’ protections. Trust isn’t a paid feature.</p>
            </MiniCard>
          </CardGrid>
        </div>
      </section>
      <CtaBand title="Start on Free. Upgrade when the calendar fills up." />
    </>
  );
}
