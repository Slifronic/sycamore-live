import { CtaBand, PageHero, Section } from '@/components/site/Blocks';
import { CardGrid, MiniCard } from '@/components/site/Feature';
import { PricingTable } from '@/components/site/PricingTable';
import { pageMeta } from '@/components/site/meta';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'Pricing',
  'Planned pricing for organizations: Free, Core, Program and Multi-site. Volunteers are always free, and nothing is charged during the demo.',
  '/pricing',
);

export default function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing" title={['Free to start.', <em key="e">Always free for volunteers.</em>]} lede="Organizations pay for more events and more coordinators. Volunteers never pay." />
      <section className={p.plans} aria-label="Plans">
        <div className={p.plansWrap}>
          <PricingTable />
          <p className={p.planNote}>Planned pricing. SycaMore Live is a student demo: nothing is charged and there’s no checkout.</p>
        </div>
      </section>
      <Section id="included" eyebrow="On every plan" title="Trust isn’t a paid feature.">
        <CardGrid cols={3}>
          <MiniCard icon="users" title="Volunteers are free">
            <p>Check-in, hours, share links, badges and Discover, on every plan.</p>
          </MiniCard>
          <MiniCard icon="check" title="Records outlive the plan">
            <p>A verified record stays checkable at its link, whatever plan the organization is on.</p>
          </MiniCard>
          <MiniCard icon="shield" title="The same rules everywhere">
            <p>Reasons for every change, read-only after verifying, and the protections for minors.</p>
          </MiniCard>
        </CardGrid>
      </Section>
      <CtaBand title="Start on Free. Upgrade when the calendar fills up." />
    </>
  );
}
