import Link from 'next/link';
import { CtaBand, Facts, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { ArtWell, CardGrid, FeatureRow, MiniCard } from '@/components/site/Feature';
import { CheckInMock, MyHoursMock } from '@/components/site/Drawings';
import { JourneyFlow } from '@/components/site/Journey';
import { Statement } from '@/components/site/Proof';
import { RecordPreview } from '@/components/site/RecordPreview';
import { StepBar } from '@/components/site/StepBar';
import { featuredRecord } from '@/components/site/featured-record';
import { JOURNEY, journeyFacts } from '@/components/site/journey-data';
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
        lede="Scan in and out at the event. The organization confirms. You get a record anyone can check, with no account. Always free."
        ambient
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
        <TextLink href={f.href}>See a sample record</TextLink>
      </PageHero>

      <StepBar
        label="Your path"
        steps={[...JOURNEY.map((st) => ({ id: `step-${st.id}`, label: st.short })), { id: 'minors', label: 'Under 18' }]}
      >
        <Section
          id="path"
          eyebrow="Your path"
          title="From the QR code to the application."
          lede={`Follow ${f.first}, from the demo’s made-up names. You scan; the organization confirms; the record is yours.`}
        >
          <JourneyFlow facts={f} ids />
        </Section>

        <section className={p.season} aria-label="Sustained service">
          <div className={ss.wrap}>
            <Statement
              cite={
                <>
                  Harvard’s Making Caring Common project, in its 2016 report{' '}
                  <a href="https://mcc.gse.harvard.edu/reports/turning-the-tide-college-admissions" rel="noopener noreferrer" target="_blank">
                    Turning the Tide
                  </a>
                  , asks colleges to value meaningful, sustained service and the quality of activities over their number.
                </>
              }
            >
              One record is a morning. A season of them shows months of showing up, and every one of them is checkable.
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
            <p>Whoever opens it sees VERIFIED or REVOKED, the organization’s statement and how the hours were captured. No account needed.</p>
            <Facts
              items={[
                'Each organization you serve with is a folder of your records.',
                'Print any record or save it as a PDF.',
                'Until the organization confirms, an event shows as waiting, with no number.',
              ]}
            />
            <TextLink href={f.href}>Open a verified record</TextLink>
          </FeatureRow>
        </Section>

        <Section id="more" well eyebrow="And also" title="Find events, earn signed badges.">
          <CardGrid cols={3}>
            <MiniCard icon="compass" title="Discover">
              <p>Upcoming public events from every organization, ranked in your browser by what you want: use your experience, learn something new, or follow your interests.</p>
              <p>
                <Link href="/discover">Open Discover</Link>
              </p>
            </MiniCard>
            <MiniCard icon="award" title="Badges">
              <p>Signed by a coordinator, not handed out by an algorithm. A badge shows the rule, the signer and their note, and makes no skill claims.</p>
            </MiniCard>
            <MiniCard icon="user" title="Your data">
              <p>Announcements stay off until you opt in. Download your data or delete your account at any time.</p>
              <p>
                <Link href="/data">How it works</Link>
              </p>
            </MiniCard>
          </CardGrid>
        </Section>

        <Section id="minors" eyebrow="Under 18" title="Extra care, enforced on the server.">
          <CardGrid cols={4}>
            <MiniCard icon="shield" title="Under 13">
              <p>Can’t join. Nothing is stored.</p>
            </MiniCard>
            <MiniCard icon="share" title="Sharing">
              <p>Ages 13 to 17 keep their hours; sharing needs a guardian’s OK.</p>
            </MiniCard>
            <MiniCard icon="message" title="Messages">
              <p>Announcements only. No event chats or direct messages.</p>
            </MiniCard>
            <MiniCard icon="pin" title="Location">
              <p>Off unless you turn it on. No coordinates stored.</p>
            </MiniCard>
          </CardGrid>
        </Section>
      </StepBar>

      <CtaBand
        title="Got an event coming up?"
        text="Join with your name, email and birth date. Then scan the code at the sign-in table."
        primary={{ href: '/join', label: 'Join as a volunteer' }}
        secondary={{ href: '/discover', label: 'Discover events' }}
        note="Volunteers never pay."
      />
    </>
  );
}
