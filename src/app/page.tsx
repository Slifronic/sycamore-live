import type { Metadata } from 'next';
import Link from 'next/link';
import { getImageProps } from 'next/image';
import { SiteShell } from '@/components/site/SiteShell';
import { CtaBand, Illo, SectionHead, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { GooeyWord } from '@/components/site/GooeyWord';
import { Tilt } from '@/components/site/Tilt';
import { Marquee } from '@/components/site/Marquee';
import { ClipboardStory, type StoryStep } from '@/components/site/ClipboardStory';
import { Laptop, Phone, Photo } from '@/components/site/Frames';
import { QrCard, RosterMock, VerifyMock } from '@/components/site/Mocks';
import { RecordPreview } from '@/components/site/RecordPreview';
import { Reveal, RevealGroup } from '@/components/site/Reveal';
import { SpotlightGroup } from '@/components/site/Spotlight';
import { Ticker } from '@/components/site/Ticker';
import { featuredRecord } from '@/components/site/featured-record';
import { photo } from '@/components/site/media';
import { HeroVideo } from '@/components/site/HeroVideo';
import s from './landing.module.css';

export const metadata: Metadata = {
  title: 'SycaMore Live · Volunteer hours, on the record as the event happens',
  description:
    'Volunteers scan in and out, the coordinator verifies in about two minutes, and every volunteer gets a record a school or scholarship committee can check.',
};

const DRIVERS = [
  'California State Seal of Civic Engagement',
  'District 40-hour graduation rules',
  'Maryland: 75 service hours to graduate',
  'Arkansas LEARNS: 75 agency-certified hours',
  'Florida Bright Futures service hours',
  'President’s Volunteer Service Award, paused since May 2025',
];

function HeroPicture() {
  const common = { alt: 'Volunteers planting native saplings along a creek bank in morning light', sizes: '(min-width: 960px) 46vw, 100vw' };
  const {
    props: { srcSet: tall },
  } = getImageProps({ ...common, width: 1200, height: 1500, src: photo('hero-creek-portrait') });
  const {
    props: { srcSet: wide, ...rest },
  } = getImageProps({ ...common, width: 1600, height: 1200, src: photo('hero-creek'), priority: true });
  return (
    <picture className={s.heroPicture}>
      <source media="(min-width: 960px)" srcSet={tall} />
      <source srcSet={wide} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img {...rest} />
    </picture>
  );
}

const TRUST = [
  ['SycaMore records the hours and names the organization that confirms them.', 'It doesn’t observe or grade the work itself.'],
  ['Every adjustment is printed on the record, with its reason.', 'Captured hours and adjusted hours are shown side by side.'],
  ['Under-13s can’t join.', 'The sign-up refuses, and nothing is stored.'],
  ['Minors can’t share a record without a guardian’s OK.', 'Ages 13 to 17 keep their hours; sharing waits for a guardian.'],
  ['Nothing is edited after verification.', 'A database rule makes verified rows read-only. An organization can only revoke a record.'],
  ['AI drafts, people decide.', 'Claude can draft rows from a paper sheet. Nothing saves until a coordinator confirms each one.'],
] as const;

const WHO = [
  {
    n: '01',
    title: 'Coordinators',
    sub: 'Run the day, verify in two minutes, stop hand-signing letters.',
    href: '/organizations',
    img: photo('audience-coordinator', true),
  },
  {
    n: '02',
    title: 'Volunteers',
    sub: 'Scan in, scan out, keep every confirmed hour in one place.',
    href: '/volunteers',
    img: photo('audience-volunteer', true),
  },
  {
    n: '03',
    title: 'Schools & scholarship committees',
    sub: 'Check a record in seconds: who vouches, for what, who to call.',
    href: '/trust',
    img: photo('audience-school', true),
  },
];

export default async function Home() {
  const record = await featuredRecord();
  const recordHref = record?.code ? `/v/${record.code}` : '/trust';

  const story: StoryStep[] = [
    {
      key: 'before',
      label: 'Before',
      title: 'A clipboard, a pen on a string, and a guess.',
      body: (
        <>
          <p>
            Most volunteer hours still start on a paper sheet. Times get rounded, names get misspelled, and weeks later a coordinator
            hand-signs hour letters from memory.
          </p>
          <p>Schools and scholarship committees are then asked to trust a signature they can’t check.</p>
        </>
      ),
      visual: (
        <Photo
          src={photo('before-clipboard')}
          alt="A paper sign-in sheet on a clipboard, with handwritten names and times"
          sizes="(min-width: 960px) 52vw, 100vw"
          ratio="5 / 4"
          className={s.storyPhoto}
        />
      ),
    },
    {
      key: 'scan',
      label: 'Scan in, scan out',
      title: 'Volunteers check themselves in. Nobody types their hours.',
      body: (
        <>
          <p>
            Put the event’s QR code on a screen or a printed sign. Volunteers scan it with their own phones, and scan again when they
            leave. Check-in opens two hours before the start.
          </p>
          <ul>
            <li>Walk-ins get a second code that signs them up and checks them in at once.</li>
            <li>No phone? The coordinator adds them by name.</li>
          </ul>
        </>
      ),
      visual: (
        <div className={s.scanVisual}>
          <Phone name="checkin-phone" className={s.scanPhone} />
          <QrCard className={s.scanQr} />
        </div>
      ),
    },
    {
      key: 'verify',
      label: 'Verify, with reasons',
      title: 'Close the event and confirm everyone in about two minutes.',
      body: (
        <>
          <p>Hours arrive pre-filled from the scans. One tap fills in anyone who didn’t scan out, and the reason is printed on their record.</p>
          <ul>
            <li>Any changed hour needs a reason.</li>
            <li>Shifts over 8 hours and duplicate names are flagged.</li>
            <li>Once verified, the rows are read-only.</li>
          </ul>
        </>
      ),
      visual: <VerifyMock className={s.storyVerify} />,
    },
    {
      key: 'record',
      label: 'A record to share',
      title: 'Every volunteer leaves with a record anyone can check.',
      body: (
        <>
          <p>
            The record says who is vouching, for which event, on what day, for how many hours, and how those hours were captured. A share
            link opens it for anyone, no account needed.
          </p>
          <p>
            <TextLink href={recordHref}>See a verified record</TextLink>
          </p>
        </>
      ),
      visual: (
        <div className={s.storyRecord}>
          <RecordPreview r={record} />
        </div>
      ),
    },
  ];

  return (
    <SiteShell>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className={s.hero} aria-labelledby="hero-title" data-tilt-scope>
        <div className={`${ss.wrap} ${s.heroGrid}`}>
          <div className={s.heroText}>
            <p className={`${ss.eyebrow} ${ss.fade}`}>For organizations that run volunteer events</p>
            <h1 className={s.heroTitle} id="hero-title">
              <span className={ss.ln}>
                <span style={{ ['--i' as string]: 0 }}>Volunteer hours,</span>{' '}
              </span>
              <span className={ss.ln}>
                <span style={{ ['--i' as string]: 1 }}>
                  on the <GooeyWord from="clipboard" to="record" delay={1700} />
                </span>{' '}
              </span>
              <span className={ss.ln}>
                <span style={{ ['--i' as string]: 2 }}>as the event</span>{' '}
              </span>
              <span className={ss.ln}>
                <span style={{ ['--i' as string]: 3 }}>happens.</span>
              </span>
            </h1>
            <p className={`${s.heroLede} ${ss.fade}`} style={{ ['--d' as string]: '.45s' }}>
              Volunteers scan in and out at the sign-in table. When the event closes, the coordinator verifies everyone’s hours, and each
              volunteer gets a record a school or scholarship committee can check.
            </p>
            <div className={`${s.heroCtas} ${ss.fade}`} style={{ ['--d' as string]: '.6s' }}>
              <div className={ss.ctas}>
                <Link href="/org/start" className="btn btn-primary btn-big">
                  Set up your organization
                </Link>
                <Link href="/join" className="btn btn-big">
                  I’m volunteering
                </Link>
              </div>
              <TextLink href={recordHref}>See a verified record</TextLink>
            </div>
            <ul className={`${s.heroFacts} ${ss.fade}`} style={{ ['--d' as string]: '.75s' }}>
              <li>Always free for volunteers</li>
              <li>No app to install</li>
              <li>Under-13s can’t join</li>
            </ul>
          </div>

          <div className={`${s.heroArt} ${ss.fade}`} style={{ ['--d' as string]: '.2s' }}>
            <div className={s.heroPhoto}>
              <HeroPicture />
              <HeroVideo />
              <div className={s.rays} aria-hidden="true" />
              <div className={s.heroShade} aria-hidden="true" />
              <p className={s.heroChip} aria-hidden="true">
                <span className={s.dot} /> Check-in open
              </p>
            </div>
            <Tilt className={s.heroCard}>
              <div className={s.float}>
                <RecordPreview r={record} compact />
              </div>
            </Tilt>
          </div>
        </div>
      </section>

      {/* ── Demand drivers ───────────────────────────────── */}
      <section className={s.drivers} aria-labelledby="drivers-title">
        <div className={ss.wrap}>
          <h2 className={s.driversTitle} id="drivers-title">
            Service hours already count toward
          </h2>
        </div>
        <Marquee items={DRIVERS} label="Programs that ask for service hours" />
      </section>

      {/* ── From clipboard to record ─────────────────────── */}
      <section className={ss.section} aria-labelledby="story-title">
        <div className={ss.wrap}>
          <SectionHead
            id="story-title"
            eyebrow="From clipboard to record"
            title="The sign-in table becomes the record."
            lede="Four moments, one event. Running the day gets no harder, and the paperwork afterwards goes away."
            split
          />
          <ClipboardStory steps={story} />
        </div>
      </section>

      {/* ── How it works bento ───────────────────────────── */}
      <section className={`${ss.section} ${s.bentoSection}`} aria-labelledby="how-title">
        <div className={ss.wrap}>
          <SectionHead
            id="how-title"
            eyebrow="How it works"
            title="Four steps, and the coordinator stays in charge."
            lede="SycaMore Live records what happened at the sign-in table. The organization decides what goes on the record."
            split
          />
          <SpotlightGroup className={s.bento}>
            <Reveal as="article" className={`${ss.paper} ${ss.spot} ${s.cell} ${s.c2}`}>
              <div data-spot className={s.cellInner}>
                <Illo name="sapling" size={96} />
                <p className={s.cellStep}>01 · Set up</p>
                <h3 className={ss.h3}>Ready in about a minute</h3>
                <p className={ss.body}>Four boxes, then a practice event and a 7-minute course that teaches by doing.</p>
              </div>
            </Reveal>
            <Reveal as="article" className={`${ss.paper} ${ss.spot} ${s.cell} ${s.c4}`} delay={80}>
              <div data-spot className={`${s.cellInner} ${s.cellSplit}`}>
                <div className={s.cellCopy}>
                  <p className={s.cellStep}>02 · Event day</p>
                  <h3 className={ss.h3}>One QR code, a live roster</h3>
                  <p className={ss.body}>
                    Show the code full-screen or print the sign. The roster fills as people scan; walk-ins sign up with a second code and show as
                    “Signed up at the door”.
                  </p>
                </div>
                <div className={s.cellArt}>
                  <Laptop name="event-day" className={s.cellLaptop} />
                  <RosterMock className={s.cellRoster} />
                </div>
              </div>
            </Reveal>
            <Reveal as="article" className={`${ss.paper} ${ss.spot} ${s.cell} ${s.c3}`}>
              <div data-spot className={s.cellInner}>
                <p className={s.cellStep}>03 · Verify</p>
                <h3 className={ss.h3}>Two minutes, every change explained</h3>
                <p className={ss.body}>
                  Hours are pre-filled from the scans. Paper sheet too? Photograph it and Claude drafts the rows; nothing saves until you confirm each
                  one.
                </p>
                <Laptop name="verify" className={s.cellWide} />
              </div>
            </Reveal>
            <Reveal as="article" className={`${ss.paper} ${ss.spot} ${s.cell} ${s.c3}`} delay={80}>
              <div data-spot className={`${s.cellInner} ${s.cellPhoneRow}`}>
                <div className={s.cellCopy}>
                  <p className={s.cellStep}>04 · Share</p>
                  <h3 className={ss.h3}>A record, a letter, a report</h3>
                  <p className={ss.body}>
                    Volunteers get a share link anyone can check. You get printable hour letters for schools and a funder report with the totals.
                  </p>
                  <Illo name="envelope" size={84} />
                </div>
                <Phone name="me-phone" className={s.cellPhone} />
              </div>
            </Reveal>
          </SpotlightGroup>
          <p className={s.bentoMore}>
            <TextLink href="/how-it-works">The full walk-through</TextLink>
          </p>
        </div>
      </section>

      {/* ── Pilot numbers ────────────────────────────────── */}
      <section className={s.pilot} aria-labelledby="pilot-title">
        <div className={ss.wrap}>
          <Reveal className={s.pilotCard}>
            <div className={s.pilotHead}>
              <p className={`${ss.eyebrow} ${s.pilotEyebrow}`}>Where this started</p>
              <h2 className={s.pilotTitle} id="pilot-title">
                One paper pilot, counted by hand.
              </h2>
            </div>
            <dl className={s.stats}>
              <div>
                <dt>planting events</dt>
                <dd>
                  <Ticker to={4} />
                </dd>
              </div>
              <div>
                <dt>attendances (sign-ins)</dt>
                <dd>
                  <Ticker to={203} />
                </dd>
              </div>
              <div>
                <dt>volunteer hours</dt>
                <dd>
                  <Ticker to={609} />
                </dd>
              </div>
              <div>
                <dt>trees planted</dt>
                <dd>
                  <Ticker to={100} suffix="+" />
                </dd>
              </div>
            </dl>
            <p className={s.pilotNote}>
              The SycaMore team’s paper-based pilot with Our City Forest, February to March 2026. Every number came off paper sign-in sheets, before
              SycaMore Live existed. 203 counts sign-ins across the four events, not 203 different people.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Who it's for (image-reveal list) ─────────────── */}
      <section className={ss.section} aria-labelledby="who-title">
        <div className={ss.wrap}>
          <SectionHead
            id="who-title"
            eyebrow="Who it’s for"
            title="Three people read every record."
            lede="The coordinator who vouches for it, the volunteer who earned it, and the stranger deciding whether to believe it."
            split
          />
          <ul className={s.who}>
            {WHO.map((w) => (
              <li key={w.n}>
                <Link href={w.href} className={s.whoRow}>
                  <span className={s.whoThumb} aria-hidden="true">
                    <Photo src={w.img} alt="" sizes="(hover: hover) 220px, 72px" className={s.whoImg} />
                  </span>
                  <span className={s.whoNum} aria-hidden="true">
                    {w.n}
                  </span>
                  <span className={s.whoTitle}>{w.title}</span>
                  <span className={s.whoSub}>{w.sub}</span>
                  <span className={s.whoArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────── */}
      <section className={`${ss.section} ${s.trust}`} aria-labelledby="trust-title">
        <div className={`${ss.wrap} ${s.trustGrid}`}>
          <Reveal className={s.trustHead}>
            <p className={ss.eyebrow}>Trust</p>
            <h2 className={ss.h2} id="trust-title">
              What the record says, and what it doesn’t.
            </h2>
            <p className={ss.lede}>
              A record is the organization’s statement, captured by the tool it used at the sign-in table. These are the rules it keeps.
            </p>
            <TextLink href="/trust">Read the record line by line</TextLink>
          </Reveal>
          <RevealGroup as="ul" className={s.trustList} itemAs="li" step={60}>
            {TRUST.map(([t, d]) => (
              <div key={t} className={s.trustItem}>
                <span className={ss.check} aria-hidden="true">
                  ✓
                </span>
                <div>
                  <p className={s.trustT}>{t}</p>
                  <p className={s.trustD}>{d}</p>
                </div>
              </div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── One real quote (testimonials/five) ───────────── */}
      <section className={ss.sectionTight} aria-label="What a partner said">
        <Reveal className={`${ss.narrow} ${s.quote}`}>
          <Illo name="seed-pod" size={72} className={s.quoteIllo} />
          <figure>
            <blockquote className={s.quoteText}>
              <p>“…particularly smaller organizations that don’t have the resources to create their own platforms.”</p>
            </blockquote>
            <figcaption className={s.quoteBy}>
              <b>Dave Poeschel</b>
              <span>Friends of Guadalupe Oak Grove Park · SV Youth Climate Action</span>
            </figcaption>
          </figure>
        </Reveal>
      </section>

      <CtaBand />
    </SiteShell>
  );
}
