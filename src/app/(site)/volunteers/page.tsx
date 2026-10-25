import Link from 'next/link';
import { CtaBand, Facts, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { ArtWell, CardGrid, FeatureRow, MiniCard } from '@/components/site/Feature';
import { CheckInMock, MyHoursMock } from '@/components/site/Drawings';
import { RecordPreview } from '@/components/site/RecordPreview';
import { featuredRecord } from '@/components/site/featured-record';
import { pageMeta } from '@/components/site/meta';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'For volunteers',
  'Check in with your phone, keep every confirmed hour in one place, and share a record anyone can check. Always free for volunteers.',
  '/volunteers',
);

const STEPS = [
  { n: '1', title: 'Scan the code', text: 'At the sign-in table. New? Join in one step.' },
  { n: '2', title: 'Serve', text: 'Your phone shows a running timer. Nothing to write down.' },
  { n: '3', title: 'Scan out', text: 'Forget? The coordinator fills it in, with the reason printed.' },
];

export default async function Volunteers() {
  const record = await featuredRecord();
  return (
    <>
      <PageHero
        eyebrow="For volunteers"
        title={['Your hours,', <em key="e">confirmed and yours.</em>]}
        lede="Scan in and out. The organization confirms. You get a record anyone can check. Always free."
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
            Join in one step
          </Link>
          <Link href="/discover" className="btn btn-big">
            Find an event
          </Link>
        </div>
      </PageHero>

      <Section id="steps" eyebrow="At the event" title="Three taps, no typing.">
        <ol className={p.steps}>
          {STEPS.map((st) => (
            <li key={st.n}>
              <span className={p.stepN}>{st.n}</span>
              <h3 className={ss.h3}>{st.title}</h3>
              <p className={ss.body}>{st.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="record" well label="Your record">
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
          <TextLink href={record?.code ? `/v/${record.code}` : '/trust'}>Open a verified record</TextLink>
        </FeatureRow>
      </Section>

      <Section id="more" eyebrow="And also" title="Find events, earn signed badges.">
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

      <Section id="minors" well eyebrow="Under 18" title="Extra care, enforced on the server.">
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
