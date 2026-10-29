import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { CtaBand, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { FAQ, FaqList, type QA } from '@/components/site/Faq';
import { Attestation } from '@/components/site/Attestation';
import { Botanicals } from '@/components/site/Botanicals';
import { GroveHero } from '@/components/site/GroveHero';
import { HomeTrust } from '@/components/site/HomeTrust';
import { Journey } from '@/components/site/Journey';
import { Reveal } from '@/components/site/Reveal';
import { SpotlightGroup } from '@/components/site/Spotlight';
import { MyHoursMock, NeedsYouMock } from '@/components/site/Drawings';
import { featuredRecord } from '@/components/site/featured-record';
import { journeyFacts } from '@/components/site/journey-data';
import { CountUp } from '@/components/motion/CountUp';
import { Icon, type IconName } from '@/components/shell/icons';
import g from '@/components/site/glass.module.css';
import s from './landing.module.css';

const TITLE = 'SycaMore Live · Volunteer hours a school can actually check';
const DESCRIPTION =
  'Volunteers scan in and out at the event, the organization confirms the hours in about two minutes, and every record gets a link anyone can check.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/', type: 'website', siteName: 'SycaMore Live', locale: 'en_US' },
};

/** "Evidence from the day" as three notes on the record. Each icon matches a link in the card's chain. */
const NOTES: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'scan', title: 'Scanned in and out on the day', sub: 'Not typed in later.' },
  { icon: 'check', title: 'Attested by the organization', sub: 'Never by the volunteer.' },
  { icon: 'eye', title: 'Revocable, and the page shows it', sub: 'Withdrawn records say REVOKED.' },
];

/** Product rules, not customer numbers (there are none yet). */
const STATS: { value: number; prefix?: string; suffix?: string; label: string }[] = [
  { value: 2, prefix: '~', suffix: ' min', label: 'to verify a whole event' },
  { value: 0, label: 'hours typed by volunteers' },
  { value: 1, suffix: ' link', label: 'to check a record, no account needed' },
  { value: 2, suffix: ' h', label: 'check-in window either side of an event' },
];

const HOME_QS = ['app', 'forgot', 'schools', 'signup', 'company'];
const homeFaq = HOME_QS.map((id) => FAQ.find((q) => q.id === id)).filter((q): q is QA => q !== undefined);

export default async function Home() {
  const record = await featuredRecord();
  const f = journeyFacts(record);

  return (
    <SiteShell>
      {/* 1 · Hero: the grove, the outcome, and three ways in. */}
      <GroveHero
        eyebrow="Evidence, not signatures"
        title={
          <>
            Volunteer hours a school can <em>actually check.</em>
          </>
        }
        lede="Volunteers scan in and out. The organization confirms. Anyone can check the link."
        actions={
          <>
            <Link href="/org/start" className={`${g.pill} ${g.primary}`}>
              <span className={g.text}>
                <small>For coordinators</small>
                Start free
              </span>
              <span className={g.knob} aria-hidden="true">
                <Icon name="arrow-right" size={18} />
              </span>
            </Link>
            <Link href="/join" className={g.pill}>
              <span className={g.text}>
                <small>For volunteers</small>
                Join free
              </span>
              <span className={g.knob} aria-hidden="true">
                <Icon name="arrow-right" size={18} />
              </span>
            </Link>
            <a href="#record" className={`${g.pill} ${g.quiet}`}>
              <span className={g.text}>
                <small>For reviewers</small>
                Check a record
              </span>
            </a>
          </>
        }
      />

      {/* 2 · The proof: a real record, annotated with why it holds up. */}
      <section id="record" className={s.record} aria-labelledby="record-title">
        <Botanicals
          items={[
            { kind: 'leaf', right: 'max(-40px, calc((100vw - 1240px) / 2 - 90px))', top: '-10px', size: 300, rotate: 18, tone: 'soft' },
            { kind: 'seed', left: 'max(12px, calc((100vw - 1240px) / 2 - 40px))', bottom: '8%', size: 120, rotate: -14, wide: true },
          ]}
        />
        <div className={`${ss.wrap} ${s.recordGrid}`}>
          <Reveal className={s.recordText}>
            <p className={ss.eyebrow}>Live sample record</p>
            <h2 className={ss.h2} id="record-title">
              What a school sees <em>at the link.</em>
            </h2>
            <ol className={s.notes}>
              {NOTES.map((n, i) => (
                <li key={n.title} data-note={i + 1}>
                  <span className={s.noteDot} aria-hidden="true">
                    <Icon name={n.icon} size={16} />
                  </span>
                  <span className={s.noteText}>
                    <b>{n.title}</b>
                    <small>{n.sub}</small>
                  </span>
                </li>
              ))}
            </ol>
            <TextLink href="/trust">How the record holds up</TextLink>
          </Reveal>
          <Reveal className={s.recordCard} delay={80}>
            <Attestation r={record} f={f} />
          </Reveal>
        </div>
      </section>

      {/* 3 · The numbers: product rules, each one checkable. */}
      <section className={s.stats} aria-labelledby="stats-title">
        <div className={ss.wrap}>
          <h2 className="sr-only" id="stats-title">
            In numbers
          </h2>
          <dl className={s.statRow}>
            {STATS.map((st) => (
              <div key={st.label} className={s.stat}>
                <dt>{st.label}</dt>
                <dd>
                  <CountUp value={st.value} prefix={st.prefix} suffix={st.suffix} duration={0.9} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 4 · The volunteer journey: the signature, pinned and scrubbed by scroll. */}
      <section id="journey" className={s.journey} aria-labelledby="journey-title">
        <Botanicals items={[{ kind: 'seed', right: 'max(8px, calc((100vw - 1240px) / 2 + 20px))', top: '40px', size: 140, rotate: 8, wide: true, tone: 'soft' }]} />
        <div className={ss.wrap}>
          <Reveal className={s.journeyHead}>
            <p className={ss.eyebrow}>The volunteer path</p>
            <h2 className={ss.h2} id="journey-title">
              {f.first}’s three hours, <em>start to finish.</em>
            </h2>
          </Reveal>
        </div>
        <Journey facts={f} skipTo={{ href: '#paths', label: 'Skip ahead' }} />
      </section>

      {/* 5 · The fork: each side to the page that owns it. */}
      <section id="paths" className={s.forkSection} aria-labelledby="fork-title">
        <div className={ss.wrap}>
          <h2 className="sr-only" id="fork-title">
            Two sides of the sign-in table
          </h2>
          <SpotlightGroup className={s.fork}>
            <Reveal as="article" className={`${s.forkCard} ${ss.spot}`}>
              <div data-spot="" className={s.forkInner}>
                <div className={s.forkArt}>
                  <NeedsYouMock />
                </div>
                <p className={ss.eyebrow}>I run volunteers</p>
                <h3 className={s.forkTitle}>Run the day. Verify it in two minutes.</h3>
                <p className={ss.body}>Set-up, sign-in table, verify, funder report.</p>
                <div className={s.forkActions}>
                  <Link href="/org/start" className="btn btn-primary">
                    Start free
                  </Link>
                  <Link href="/organizations" className={`${s.forkMain} ${s.away}`}>
                    For organizations <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal as="article" className={`${s.forkCard} ${ss.spot}`} delay={70}>
              <div data-spot="" className={s.forkInner}>
                <div className={s.forkArt}>
                  <MyHoursMock />
                </div>
                <p className={ss.eyebrow}>I volunteer</p>
                <h3 className={s.forkTitle}>Hours that are yours, always free.</h3>
                <p className={ss.body}>Every confirmed hour in one place, one link each.</p>
                <div className={s.forkActions}>
                  <Link href="/join" className="btn">
                    Join free
                  </Link>
                  <Link href="/volunteers" className={`${s.forkMain} ${s.away}`}>
                    For volunteers <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </SpotlightGroup>
        </div>
      </section>

      {/* 6 · Trust: what makes the record worth reading. */}
      <Section
        id="trust"
        well
        eyebrow="Trust and safety"
        title="Careful by default. Many volunteers are teens."
        action={<TextLink href="/trust">All the rules</TextLink>}
        sprigs={[{ kind: 'leaf', left: 'max(-30px, calc((100vw - 1240px) / 2 - 120px))', top: '20px', size: 180, rotate: -20, wide: true, tone: 'soft' }]}
      >
        <HomeTrust f={f} />
      </Section>

      {/* 7 · Questions, closed until asked. */}
      <section id="questions" className={s.questions} aria-labelledby="faq-title">
        <div className={`${ss.wrap} ${s.closing}`}>
          <Reveal className={s.faqHead}>
            <p className={ss.eyebrow}>Questions</p>
            <h2 className={ss.h2} id="faq-title">
              Asked <em>often.</em>
            </h2>
            <TextLink href="/faq">All questions</TextLink>
          </Reveal>
          <Reveal className={s.faq} delay={60}>
            <FaqList items={homeFaq} openFirst={false} />
          </Reveal>
        </div>
      </section>

      {/* 8 · The close, with the one pricing line. */}
      <CtaBand
        title="Put your next event on the record."
        text="Free for volunteers. Free to start for organizations."
        note="Nothing is charged during the demo."
      />
    </SiteShell>
  );
}
