import { CtaBand, PageHero, Section, siteStyles as ss } from '@/components/site/Blocks';
import { Photo } from '@/components/site/Frames';
import { Reveal, RevealGroup } from '@/components/site/Reveal';
import { photo } from '@/components/site/media';
import { pageMeta } from '@/components/site/meta';
import { CountUp } from '@/components/motion/CountUp';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'About',
  'Why SycaMore Live exists: a paper planting pilot, hour letters signed by hand, and a student team that started this build at Cal Hacks 13.0.',
  '/about',
);

const TEAM = [
  ['Bryant Vo', 'SycaMore · this Cal Hacks build'],
  ['Shakil Musthafa', 'SycaMore'],
  ['Timothy Nguyen', 'SycaMore'],
  ['William Devanney', 'SycaMore'],
  ['Lê Nam Khánh', 'This Cal Hacks build'],
] as const;

const initials = (n: string) =>
  n
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title={['We counted the hours', <em key="e">on paper first.</em>]}
        lede="A student project, built because we saw where the hours went missing."
        art={
          <figure className={p.figure}>
            <Photo src={photo('cover-planting')} alt="Young native trees staked along a creek bank" sizes="(min-width: 960px) 560px, 92vw" ratio="4 / 3" preload />
            <figcaption>AI-generated illustrative image, not a photo of the pilot.</figcaption>
          </figure>
        }
      />

      <Section id="why" eyebrow="Why it exists" title="Four planting events. Every hour on a clipboard.">
        <div className={p.storyGrid}>
          <Reveal className={p.prose}>
            <p>
              In February and March 2026, the SycaMore team ran a paper pilot with <strong>Our City Forest</strong>. Afterwards the hours had to be typed
              up, checked against memory, and turned into letters signed by hand. A school reading one had no way to check it.
            </p>
            <p>SycaMore Live moves the record to the moment of service: scan in and out, the organization confirms, anyone with the link can check.</p>
          </Reveal>
          <dl className={p.statRow}>
            <div>
              <dt>events</dt>
              <dd>
                <CountUp value={4} />
              </dd>
            </div>
            <div>
              <dt>sign-ins, not people</dt>
              <dd>
                <CountUp value={203} />
              </dd>
            </div>
            <div>
              <dt>hours, on paper</dt>
              <dd>
                <CountUp value={609} />
              </dd>
            </div>
          </dl>
        </div>
      </Section>

      <Section id="team" well eyebrow="The team" title="Students, building the tool they needed." lede="SycaMore Live is a new build on the same problem, started at Cal Hacks 13.0. It shares no code with SycaMore.">
        <RevealGroup className={p.team} step={50}>
          {TEAM.map(([name, role]) => (
            <div key={name} className={p.person}>
              <span className={p.initials} aria-hidden="true">
                {initials(name)}
              </span>
              <div>
                <p>{name}</p>
                <span>{role}</span>
              </div>
            </div>
          ))}
        </RevealGroup>
      </Section>

      <Section id="history" eyebrow="So far" title="A short history.">
        <ol className={p.timeline}>
          <li>
            <b>Feb–Mar 2026</b>
            <strong>The paper pilot</strong>
            <p className={ss.body}>Four planting events with Our City Forest, counted on paper.</p>
          </li>
          <li>
            <b>Oct 23, 2026</b>
            <strong>SycaMore Live starts</strong>
            <p className={ss.body}>A new build at Cal Hacks 13.0: both sides of the sign-in table on one database.</p>
          </li>
          <li>
            <b>Oct 25, 2026</b>
            <strong>Demo day</strong>
            <p className={ss.body}>One event, end to end: scan in, verify, share a record anyone can check.</p>
          </li>
        </ol>
      </Section>

      <CtaBand />
    </>
  );
}
