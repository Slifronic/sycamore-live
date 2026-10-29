import Link from 'next/link';
import { CtaBand, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { ChipBand, Chips, StepChips } from '@/components/site/Chips';
import { ArtWell, CardGrid, FeatureRow, MiniCard } from '@/components/site/Feature';
import { Botanicals } from '@/components/site/Botanicals';
import { Divider } from '@/components/site/Divider';
import { CheckInMock, MyHoursMock } from '@/components/site/Drawings';
import { Statement } from '@/components/site/Proof';
import { RecordPreview } from '@/components/site/RecordPreview';
import { StepBar } from '@/components/site/StepBar';
import { featuredRecord } from '@/components/site/featured-record';
import { journeyFacts } from '@/components/site/journey-data';
import { pageMeta } from '@/components/site/meta';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'For volunteers',
  'Check in with your phone, keep every confirmed hour in one place, and share a record anyone can check. Always free for volunteers.',
  '/volunteers',
);

export default async function Volunteers() {
  const record = await featuredRecord();
  const f = journeyFacts(record);
  return (
    <>
      <PageHero
        eyebrow="For volunteers"
        title={['Your hours,', <em key="e">confirmed and yours.</em>]}
        lede="You never type an hour. The organization vouches for every one. Always free."
        motif="seed"
        art={
          <ArtWell className={p.heroWell}>
            <div className={p.mockStack}>
              <CheckInMock />
              <MyHoursMock />
            </div>
          </ArtWell>
        }
      >
        <div className={ss.ctas}>
          <Link href="/join" className="btn btn-primary btn-big">
            Join as a volunteer
          </Link>
          <Link href="/discover" className="btn btn-big">
            Find an event
          </Link>
        </div>
      </PageHero>

      <StepBar
        label="On this page"
        steps={[
          { id: 'path', label: 'Your path' },
          { id: 'record', label: 'Your record' },
          { id: 'more', label: 'And also' },
          { id: 'minors', label: 'Under 18' },
        ]}
      >
        <Section id="path" eyebrow="Your path" title="From the QR code to the application." action={<TextLink href="/#journey">{`See ${f.first}’s whole journey`}</TextLink>}>
          <StepChips
            steps={[
              { icon: 'compass', label: 'Find', text: 'Pick an event on Discover.' },
              { icon: 'scan', label: 'Scan in', text: 'Scan the table’s QR code. No app.' },
              { icon: 'clock', label: 'Scan out', text: 'Scan again as you leave. Hours count themselves.' },
              { icon: 'share', label: 'Share', text: 'Send a link anyone can check.' },
            ]}
          />
        </Section>

        <section className={p.season} aria-label="Sustained service">
          <Divider edge="top" />
          <Divider edge="bottom" />
          <Botanicals
            items={[
              { kind: 'fern', left: 'max(-20px, calc((100vw - 1240px) / 2 - 80px))', top: '30px', size: 170, rotate: -10, wide: true },
              { kind: 'seed', right: 'max(8px, calc((100vw - 1240px) / 2))', bottom: '12%', size: 110, rotate: 10, tone: 'soft', wide: true },
            ]}
          />
          <div className={ss.wrap}>
            <Statement
              cite={
                <>
                  Harvard’s Making Caring Common,{' '}
                  <a href="https://mcc.gse.harvard.edu/reports/turning-the-tide-college-admissions" rel="noopener noreferrer" target="_blank">
                    Turning the Tide
                  </a>{' '}
                  (2016): value sustained service over its count.
                </>
              }
            >
              One record is a morning. A season of them shows months of showing up.
            </Statement>
          </div>
        </section>

        <Section id="record" label="Your record">
          <FeatureRow
            id="share"
            eyebrow="Your record"
            title="A link a scholarship committee can check on its own."
            art={
              <div className={p.recordArt}>
                <RecordPreview r={record} />
              </div>
            }
          >
            <p>It opens as VERIFIED or REVOKED. No account needed.</p>
            <Chips items={[{ label: 'A folder per organization', icon: 'list' }, { label: 'Print or save as PDF', icon: 'download' }, { label: 'Waiting until confirmed', icon: 'hourglass' }]} />
            <TextLink href={f.href}>Open a verified record</TextLink>
          </FeatureRow>
        </Section>

        <Section id="more" well eyebrow="And also" title="Find events, earn signed badges.">
          <CardGrid cols={3}>
            <MiniCard icon="compass" title="Discover">
              <p>Public events, ranked in your browser by what you want.</p>
              <p>
                <Link href="/discover">Open Discover</Link>
              </p>
            </MiniCard>
            <MiniCard icon="award" title="Badges">
              <p>Signed by a coordinator. Shows the rule, signer and note.</p>
            </MiniCard>
            <MiniCard icon="user" title="Your data">
              <p>Announcements off until you opt in. Download or delete anytime.</p>
              <p>
                <Link href="/data">How it works</Link>
              </p>
            </MiniCard>
          </CardGrid>
        </Section>

        <Section id="minors" label="Under 18">
          <ChipBand
            eyebrow="Under 18"
            title="Extra care, enforced on the server."
            items={[
              { label: 'Under 13 can’t join', icon: 'shield' },
              { label: 'A guardian approves sharing', icon: 'share' },
              { label: 'Announcements only', icon: 'message' },
            ]}
            action={<TextLink href="/trust#minors">The full rules</TextLink>}
          />
        </Section>
      </StepBar>

      <CtaBand
        title="Got an event coming up?"
        text="Join with your name, email and birth date."
        primary={{ href: '/join', label: 'Join as a volunteer' }}
        secondary={{ href: '/discover', label: 'Discover events' }}
        note="Volunteers never pay."
      />
    </>
  );
}
