import type { Metadata } from 'next';
import { CtaBand, PageHero, SectionHead, siteStyles as ss } from '@/components/site/Blocks';
import { Photo } from '@/components/site/Frames';
import { Reveal, RevealGroup } from '@/components/site/Reveal';
import { Ticker } from '@/components/site/Ticker';
import { photo } from '@/components/site/media';
import p from '../pages.module.css';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why SycaMore Live exists: a paper-based pilot with Our City Forest, coordinators hand-signing hour letters, and a student team that started this new build at Cal Hacks 13.0.',
};

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
        lede="SycaMore Live is a student project. It exists because the team ran a volunteer pilot the old way, and saw where the hours went missing."
        art={<Photo src={photo('cover-planting')} alt="Volunteers planting young trees together" sizes="(min-width: 960px) 520px, 92vw" ratio="4 / 3" priority />}
      />

      <section className={p.block} style={{ paddingTop: 0 }} aria-labelledby="why">
        <div className={`${ss.wrap} ${p.storyGrid}`}>
          <Reveal className={p.prose}>
            <p className={ss.eyebrow}>Why it exists</p>
            <h2 className={ss.h2} id="why">
              Four planting events. Every hour on a clipboard.
            </h2>
            <p>
              In February and March 2026, the SycaMore team ran a paper-based pilot with <strong>Our City Forest</strong>: four planting events,
              203 sign-ins and 609 volunteer hours, all written on paper sign-in sheets.
            </p>
            <p>
              Afterwards, the hours had to be typed up, checked against memory, and turned into letters that coordinators signed by hand, one
              volunteer at a time. A school reading one of those letters had no way to check it.
            </p>
            <p>
              SycaMore Live moves the record to the moment of service: the volunteer scans in and out, the organization confirms, and the record
              can be checked by anyone with the link.
            </p>
          </Reveal>
          <RevealGroup className={p.statRow} step={80}>
            <div className={p.stat}>
              <b>
                <Ticker to={4} />
              </b>
              <span>planting events</span>
            </div>
            <div className={p.stat}>
              <b>
                <Ticker to={203} />
              </b>
              <span>sign-ins (attendances)</span>
            </div>
            <div className={p.stat}>
              <b>
                <Ticker to={609} />
              </b>
              <span>hours, on paper</span>
            </div>
          </RevealGroup>
        </div>
      </section>

      <div className={p.tint}>
        <div className={ss.wrap}>
          <SectionHead
            eyebrow="The team"
            title="Students, building the tool they needed."
            id="team"
            lede="SycaMore is the team’s existing student project. SycaMore Live is a new build on the same problem, started at Cal Hacks 13.0 by Bryant Vo and Lê Nam Khánh."
            split
          />
          <RevealGroup className={p.team} step={60}>
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
        </div>
      </div>

      <section className={p.block} aria-labelledby="timeline">
        <div className={`${ss.wrap} ${p.storyGrid}`}>
          <Reveal className={p.prose}>
            <p className={ss.eyebrow}>So far</p>
            <h2 className={ss.h2} id="timeline">
              A short history.
            </h2>
            <p>
              SycaMore Live shares no code with the earlier SycaMore project. Everything here was built from scratch during the hackathon, and the
              demo uses made-up names.
            </p>
          </Reveal>
          <Reveal as="ol" className={p.timeline} delay={80}>
            <li>
              <b>Feb–Mar 2026</b>
              <strong>The paper pilot</strong>
              <p>Four planting events with Our City Forest, counted on paper sign-in sheets.</p>
            </li>
            <li>
              <b>Oct 23, 2026</b>
              <strong>SycaMore Live starts</strong>
              <p>A new build at Cal Hacks 13.0: the organization side and the volunteer side on one database.</p>
            </li>
            <li>
              <b>Oct 25, 2026</b>
              <strong>Demo day</strong>
              <p>The goal: one real event, end to end. Scan in, verify, and share a record anyone can check.</p>
            </li>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
