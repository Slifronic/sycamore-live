import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { CtaBand, Facts, RiseTitle, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { FAQ, FaqList } from '@/components/site/Faq';
import { HeroStage } from '@/components/site/HeroStage';
import { CheckInMock, MyHoursMock, NeedsYouMock, ShareMock, VerifyMock } from '@/components/site/Drawings';
import { ProductMock } from '@/components/site/ProductMock';
import { Reveal, RevealGroup } from '@/components/site/Reveal';
import { SpotlightGroup } from '@/components/site/Spotlight';
import { featuredRecord } from '@/components/site/featured-record';
import { CountUp } from '@/components/motion/CountUp';
import { Icon, type IconName } from '@/components/shell/icons';
import s from './landing.module.css';

const TITLE = 'SycaMore Live · Volunteer hours, on the record as they happen';
const DESCRIPTION =
  'Volunteers scan in and out, the coordinator verifies in about two minutes, and every volunteer gets a record a school or scholarship committee can check.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/', type: 'website', siteName: 'SycaMore Live', locale: 'en_US' },
};

const STEPS = [
  {
    n: '1',
    title: 'Check in',
    text: 'Volunteers scan the event’s QR code with their own phone, and scan out when they leave.',
    mock: <CheckInMock />,
  },
  {
    n: '2',
    title: 'Verify',
    text: 'Hours arrive pre-filled. The coordinator confirms them in about two minutes; every change needs a reason.',
    mock: <VerifyMock />,
  },
  {
    n: '3',
    title: 'Share',
    text: 'Each volunteer gets a record with a link anyone can check. No account needed to read it.',
    mock: <ShareMock />,
  },
];

const SAFETY: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'shield',
    title: 'Built for minors',
    text: 'Under 13 can’t join. Ages 13 to 17 need a guardian’s OK to share a record, and get announcements only, no direct messages.',
  },
  {
    icon: 'pin',
    title: 'No location stored',
    text: 'The leave-the-area check is off by default. When it’s on, only the time someone left is kept, never coordinates.',
  },
  {
    icon: 'check',
    title: 'AI drafts, a person decides',
    text: 'Claude can draft rows from a paper sheet. Nothing saves until a coordinator confirms each one, and it never invents a time.',
  },
];

export default async function Home() {
  const record = await featuredRecord();
  const recordHref = record?.code ? `/v/${record.code}` : '/trust';

  return (
    <SiteShell>
      {/* 1 · Hero: the promise, two paths, the product. Static at rest. */}
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={`${ss.wrap} ${s.heroGrid}`}>
          <div className={s.heroText}>
            <p className={ss.eyebrow}>For volunteer events</p>
            <RiseTitle
              id="hero-title"
              className={s.heroTitle}
              lines={['Volunteer hours,', <em key="r">on the record</em>, 'as they happen.']}
            />
            <p className={s.heroLede}>Volunteers scan in and out. The organization verifies. Every hour gets a record anyone can check.</p>
            <div className={s.paths}>
              <Link href="/org/start" className={`btn btn-primary btn-big ${s.path}`}>
                <span className={s.pathText}>
                  <small>Coordinator</small>
                  Set up your organization
                </span>
                <Icon name="arrow-right" size={20} />
              </Link>
              <Link href="/join" className={`btn btn-big ${s.path}`}>
                <span className={s.pathText}>
                  <small>Volunteer</small>
                  Join in one step
                </span>
                <Icon name="arrow-right" size={20} />
              </Link>
            </div>
            <p className={s.heroMore}>
              Already set up? <Link href="/org/login">Coordinator sign in</Link> · <Link href={recordHref}>See a verified record</Link>
            </p>
          </div>
          <div className={s.heroArt}>
            <HeroStage>
              <ProductMock />
            </HeroStage>
            <p className={s.heroCaption}>The coordinator home and a volunteer’s phone, drawn from the app. Demo data, made-up names.</p>
          </div>
        </div>
      </section>

      {/* 2 · How it works: three steps, a small live drawing each. */}
      <Section
        id="how"
        eyebrow="How it works"
        title="Three steps, and the coordinator stays in charge."
        action={<TextLink href="/how-it-works">The full walk-through</TextLink>}
      >
        <SpotlightGroup className={s.steps}>
          {STEPS.map((st, i) => (
            <Reveal key={st.n} as="article" className={`${ss.paper} ${ss.spot} ${s.step}`} delay={i * 60}>
              <div data-spot className={s.stepInner}>
                <div className={s.stepMock}>{st.mock}</div>
                <div className={s.stepCopy}>
                  <p className={s.stepNum}>Step {st.n}</p>
                  <h3 className={ss.h3}>{st.title}</h3>
                  <p className={ss.body}>{st.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </SpotlightGroup>
      </Section>

      {/* 3 · Proof, worded exactly: sign-ins, not people; on paper, not in the app. */}
      <section className={s.proof} aria-labelledby="proof-title">
        <div className={`${ss.wrap} ${s.proofGrid}`}>
          <div className={s.proofHead}>
            <p className={ss.eyebrow}>Where this started</p>
            <h2 className={s.proofTitle} id="proof-title">
              One pilot, counted by hand.
            </h2>
          </div>
          <dl className={s.proofStats}>
            <div>
              <dt>events</dt>
              <dd>
                <CountUp value={4} duration={0.8} />
              </dd>
            </div>
            <div>
              <dt>sign-ins</dt>
              <dd>
                <CountUp value={203} duration={1.1} />
              </dd>
            </div>
            <div>
              <dt>hours</dt>
              <dd>
                <CountUp value={609} duration={1.2} />
              </dd>
            </div>
          </dl>
          <p className={s.proofNote}>
            On paper, Feb–Mar 2026: the SycaMore team’s planting pilot with Our City Forest, before this app existed. 203 counts sign-ins across four
            events, not different people.
          </p>
        </div>
      </section>

      {/* 4 · Split value: one card per side of the sign-in table. */}
      <Section id="for" eyebrow="Who it’s for" title="One record, two sides of the sign-in table.">
        <div className={s.split}>
          <Reveal as="article" className={`${ss.paper} ${s.side}`}>
            <NeedsYouMock />
            <div className={s.sideCopy}>
              <p className={ss.eyebrow}>For coordinators</p>
              <h3 className={s.sideTitle}>Run the day. Verify in two minutes.</h3>
              <Facts
                items={[
                  'A full-screen QR code and a live roster.',
                  'Hour letters and a funder report, no hand-signing.',
                  'Paper sheets imported from a photo.',
                ]}
              />
              <div className={s.sideActions}>
                <Link href="/org/start" className="btn btn-primary">
                  Set up your organization
                </Link>
                <TextLink href="/organizations">For organizations</TextLink>
              </div>
            </div>
          </Reveal>
          <Reveal as="article" className={`${ss.paper} ${s.side}`} delay={60}>
            <MyHoursMock />
            <div className={s.sideCopy}>
              <p className={ss.eyebrow}>For volunteers</p>
              <h3 className={s.sideTitle}>Your hours, confirmed and yours to share.</h3>
              <Facts
                items={['No app to install, and always free.', 'Hours confirmed by the organization, not typed by you.', 'A link a scholarship committee can check.']}
              />
              <div className={s.sideActions}>
                <Link href="/join" className="btn">
                  Join as a volunteer
                </Link>
                <TextLink href="/volunteers">For volunteers</TextLink>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 5 · Trust and safety. */}
      <Section
        id="safety"
        well
        eyebrow="Trust and safety"
        title="Careful by default, because many volunteers are teenagers."
        action={<TextLink href="/trust">How the record works</TextLink>}
      >
        <RevealGroup as="ul" className={s.safety} itemAs="li" step={60}>
          {SAFETY.map((x) => (
            <div key={x.title} className={s.safetyItem}>
              <span className={ss.icon}>
                <Icon name={x.icon} size={20} />
              </span>
              <h3 className={ss.h3}>{x.title}</h3>
              <p className={ss.body}>{x.text}</p>
            </div>
          ))}
        </RevealGroup>
      </Section>

      {/* 6 · Pricing teaser and FAQ, side by side. */}
      <Section id="questions" label="Pricing and questions">
        <div className={s.closing}>
          <Reveal className={s.pricing}>
            <p className={ss.eyebrow}>Pricing</p>
            <h2 className={ss.h2} id="pricing-title">
              Free to start. Always free for volunteers.
            </h2>
            <dl className={s.plans}>
              <div>
                <dt>Free</dt>
                <dd>
                  $0 <span>3 events a month</span>
                </dd>
              </div>
              <div>
                <dt>Core</dt>
                <dd>
                  $49 <span>a month, unlimited events</span>
                </dd>
              </div>
              <div>
                <dt>Program</dt>
                <dd>
                  $129 <span>a month, funder reports</span>
                </dd>
              </div>
            </dl>
            <p className={s.planNote}>Planned prices. Nothing is charged during the demo.</p>
            <TextLink href="/pricing">Compare plans</TextLink>
          </Reveal>
          <Reveal className={s.faq} delay={60}>
            <p className={ss.eyebrow}>Questions</p>
            <h2 className={`${ss.h2} ${s.faqTitle}`} id="faq-title">
              Asked often.
            </h2>
            <FaqList items={FAQ.filter((q) => q.home)} />
            <TextLink href="/faq">All questions</TextLink>
          </Reveal>
        </div>
      </Section>

      <CtaBand />
    </SiteShell>
  );
}
