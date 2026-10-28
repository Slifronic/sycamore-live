import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { CtaBand, RiseTitle, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { FAQ, FaqList } from '@/components/site/Faq';
import { Attestation } from '@/components/site/Attestation';
import { CoordinatorPath } from '@/components/site/CoordinatorPath';
import { Journey } from '@/components/site/Journey';
import { Marquee } from '@/components/site/Marquee';
import { EvidenceCompare, Statement, TrustBento } from '@/components/site/Proof';
import { Rays } from '@/components/site/Rays';
import { Reveal } from '@/components/site/Reveal';
import { SpotlightGroup } from '@/components/site/Spotlight';
import { MyHoursMock, NeedsYouMock } from '@/components/site/Drawings';
import { featuredRecord } from '@/components/site/featured-record';
import { journeyFacts } from '@/components/site/journey-data';
import { CountUp } from '@/components/motion/CountUp';
import { Icon } from '@/components/shell/icons';
import s from './landing.module.css';

const TITLE = 'SycaMore Live · Volunteer hours a school can actually check';
const DESCRIPTION =
  'Volunteers scan in and out at the event, the organization confirms the hours in about two minutes, and every record gets a link anyone can check.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/', type: 'website', siteName: 'SycaMore Live', locale: 'en_US' },
};

const FACTS = [
  'Scanned in and out at the event',
  'Timed on the server, never typed',
  'Every changed hour needs a reason',
  'Read-only once verified',
  'A public link, no account needed',
  'VERIFIED or REVOKED, always current',
  'Under 13 can’t join',
  'No coordinates stored',
  'Volunteers never pay',
];

export default async function Home() {
  const record = await featuredRecord();
  const f = journeyFacts(record);

  return (
    <SiteShell>
      {/* 1 · Hero: the outcome, three ways in, and a live record as the proof. */}
      <section className={s.hero} aria-labelledby="hero-title">
        <Rays />
        <div className={`${ss.wrap} ${s.heroGrid}`}>
          <div className={s.heroText}>
            <p className={`${ss.eyebrow} ${ss.fade}`}>Volunteer hours, verified at the event</p>
            <RiseTitle id="hero-title" className={s.heroTitle} lines={['Volunteer hours', 'a school can', <em key="c">actually check.</em>]} />
            <p className={`${s.heroLede} ${ss.fade}`} style={{ ['--d' as string]: '0.3s' }}>
              Volunteers scan in and out at the event. The organization confirms the hours in about two minutes. Every record gets a link anyone can
              open.
            </p>
            <div className={`${s.paths} ${ss.fade}`} style={{ ['--d' as string]: '0.42s' }}>
              <Link href="/org/start" className={`btn btn-primary btn-big ${s.path}`}>
                <span className={s.pathText}>
                  <small>For coordinators</small>
                  Start free
                </span>
                <Icon name="arrow-right" size={20} />
              </Link>
              <Link href="/join" className={`btn btn-big ${s.path}`}>
                <span className={s.pathText}>
                  <small>For volunteers</small>
                  Join as a volunteer
                </span>
                <Icon name="arrow-right" size={20} />
              </Link>
            </div>
            <p className={`${s.reviewer} ${ss.fade}`} style={{ ['--d' as string]: '0.52s' }}>
              <Icon name="eye" size={16} />
              <span>
                <b>Checking a record?</b> Anyone can open a SycaMore Live link, no account needed.{' '}
                <Link href={f.href}>See a sample record</Link>
              </span>
            </p>
          </div>
          <div className={`${s.heroArt} ${ss.fade}`} style={{ ['--d' as string]: '0.18s' }}>
            <Attestation r={record} f={f} />
          </div>
        </div>
      </section>

      {/* 2 · The facts, moving. */}
      <Marquee items={FACTS} label="How a SycaMore Live record is made" />

      {/* 3 · The difference. */}
      <Section
        id="evidence"
        eyebrow="Why it holds up"
        title="Evidence from the day, not a signature after the fact."
        lede="Most service hours are typed in later and signed off by email. SycaMore Live records them while the volunteer is still there."
      >
        <EvidenceCompare />
      </Section>

      {/* 4 · The fork: two audiences, each into its own journey. */}
      <section className={s.forkSection} aria-labelledby="fork-title">
        <div className={ss.wrap}>
          <h2 className="sr-only" id="fork-title">
            Choose your side of the sign-in table
          </h2>
          <SpotlightGroup className={s.fork}>
            <Reveal as="article" className={`${s.forkCard} ${ss.spot}`}>
              <div data-spot="" className={s.forkInner}>
                <div className={s.forkArt}>
                  <MyHoursMock />
                </div>
                <p className={ss.eyebrow}>I volunteer</p>
                <h3 className={s.forkTitle}>Hours that are yours, and that anyone can check.</h3>
                <p className={ss.body}>Follow {f.first} from the QR code at the sign-in table to a scholarship application.</p>
                <div className={s.forkActions}>
                  <a href="#journey" className={s.forkMain}>
                    Walk the volunteer path <Icon name="arrow-right" size={16} />
                  </a>
                  <Link href="/join" className="btn">
                    Join as a volunteer
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal as="article" className={`${s.forkCard} ${ss.spot}`} delay={70}>
              <div data-spot="" className={s.forkInner}>
                <div className={s.forkArt}>
                  <NeedsYouMock />
                </div>
                <p className={ss.eyebrow}>I run volunteers</p>
                <h3 className={s.forkTitle}>Run the day, then verify it in about two minutes.</h3>
                <p className={ss.body}>Follow {f.coordinator}, the coordinator, from set-up to the funder report.</p>
                <div className={s.forkActions}>
                  <a href="#coordinators" className={s.forkMain}>
                    Walk the coordinator path <Icon name="arrow-right" size={16} />
                  </a>
                  <Link href="/org/start" className="btn btn-primary">
                    Start free
                  </Link>
                </div>
              </div>
            </Reveal>
          </SpotlightGroup>
        </div>
      </section>

      {/* 5 · The volunteer journey: the signature, pinned and scrubbed by scroll. */}
      <section id="journey" className={s.journey} aria-labelledby="journey-title">
        <div className={ss.wrap}>
          <Reveal className={s.journeyHead}>
            <p className={ss.eyebrow}>The volunteer path</p>
            <h2 className={ss.h2} id="journey-title">
              {f.first}’s three hours, from a QR code to a scholarship application.
            </h2>
            <p className={ss.lede}>One real record from the demo, made-up names, followed step by step.</p>
          </Reveal>
        </div>
        <Journey facts={f} skipTo={{ href: '#coordinators', label: 'Skip to the coordinator’s side' }} />
      </section>

      {/* 6 · The coordinator path, shorter. */}
      <Section
        id="coordinators"
        well
        eyebrow="The coordinator path"
        title={`${f.coordinator}’s side of the same morning.`}
        action={<TextLink href="/organizations">For organizations</TextLink>}
      >
        <CoordinatorPath />
      </Section>

      {/* 7 · Trust: what makes the record worth reading. */}
      <Section
        id="trust"
        eyebrow="Trust and safety"
        title="Careful by default, because many volunteers are teenagers."
        action={<TextLink href="/trust">How the record works</TextLink>}
      >
        <TrustBento />
      </Section>

      {/* 8 · Sustained service, and where this started. */}
      <section className={s.season} aria-labelledby="season-title">
        <div className={ss.wrap}>
          <h2 className="sr-only" id="season-title">
            Sustained service
          </h2>
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
            Admissions is asked to look for months of showing up, not one big total. SycaMore Live keeps every shift as its own dated, checkable
            record.
          </Statement>
          <div className={s.proofGrid}>
            <div className={s.proofHead}>
              <p className={ss.eyebrow}>Where this started</p>
              <p className={s.proofTitle}>One pilot, counted by hand.</p>
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
              events, not different people. There are no customers to show yet.
            </p>
          </div>
        </div>
      </section>

      {/* 9 · Pricing teaser and FAQ. */}
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
            <p className={s.planNote}>Planned prices. Nothing is charged during the demo, and a verified record stays checkable whatever the plan.</p>
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

      <CtaBand
        title="Put your next event on the record."
        text="Set-up takes about a minute, then a practice event teaches the rest. Volunteers join free, and anyone can check a record."
      />
    </SiteShell>
  );
}
