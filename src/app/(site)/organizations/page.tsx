import Link from 'next/link';
import { CtaBand, PageHero, Section, siteStyles as ss } from '@/components/site/Blocks';
import { ChipBand, More, Pairs, ProofLine } from '@/components/site/Chips';
import { ArtWell } from '@/components/site/Feature';
import { Shot } from '@/components/site/Frames';
import { CoordinatorPath } from '@/components/site/CoordinatorPath';
import { StepBar } from '@/components/site/StepBar';
import { VerifyMock } from '@/components/site/Drawings';
import { pageMeta } from '@/components/site/meta';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'For organizations',
  'For volunteer coordinators: a QR card and live roster on event day, a two-minute verify, hour letters you don’t hand-sign, and a funder report.',
  '/organizations',
);

export default function Organizations() {
  return (
    <>
      <PageHero
        eyebrow="For organizations"
        title={['Run the day.', <em key="e">Verify in two minutes.</em>]}
        lede="For the coordinator at the sign-in table. No card to start."
        art={<Shot name="event-day" preload sizes="(min-width: 960px) 600px, 92vw" />}
        motif="leaf"
      >
        <div className={ss.ctas}>
          <Link href="/org/start" className="btn btn-primary btn-big">
            Start free
          </Link>
          <Link href="/signin" className="btn btn-big">
            Sign in
          </Link>
        </div>
      </PageHero>

      <StepBar
        label="On this page"
        steps={[
          { id: 'path', label: 'Four steps' },
          { id: 'get', label: 'What you get' },
          { id: 'edges', label: 'What it won’t do' },
        ]}
      >
        <Section id="path" eyebrow="Start to finish" title="Set-up to funder report, in four steps.">
          <CoordinatorPath />
          <div className={p.after}>
            <ProofLine href="/trust" link="Why it holds up">
              Evidence from the day, not a signature after the fact.
            </ProofLine>
          </div>
        </Section>

        <Section id="get" well eyebrow="What you get" title="Checking, not typing.">
          <div className={p.split}>
            <ArtWell>
              <div className={p.mockW}>
                <VerifyMock />
              </div>
            </ArtWell>
            <div className={p.splitText}>
              <Pairs
                items={[
                  { icon: 'users', label: 'Walk-ins', text: 'The QR card’s New here side signs them up.' },
                  { icon: 'user', label: 'No phone', text: 'Add them to the roster by name.' },
                  { icon: 'clipboard', label: 'Paper sheets', text: 'Photograph one. Claude drafts, you confirm.' },
                  { icon: 'report', label: 'Hour letters', text: 'One per volunteer. Nothing to hand-sign.' },
                  { icon: 'chart', label: 'Funder report', text: 'Observed totals, no score. PDF or CSV.' },
                  { icon: 'award', label: 'Badges', text: 'The system finds who qualifies. You sign.' },
                ]}
              />
              <More summary="What goes in the letter and the report">
                <p>Each letter lists the events, roles, hours, any adjustment reasons and the verification dates.</p>
                <p>The funder report values volunteer time at Independent Sector’s 2025 preliminary rate: $41.75 an hour in California.</p>
              </More>
            </div>
          </div>
        </Section>

        <Section id="edges" label="What it won’t do">
          <ChipBand
            eyebrow="Straight answers"
            title="What it won’t do."
            items={[
              { label: 'Vouch for your volunteers', tone: 'no' },
              { label: 'Decide for you', tone: 'no' },
              { label: 'Replace your sign-up tool', tone: 'no' },
            ]}
          >
            <More summary="Why not">
              <p>The record is your organization’s statement. SycaMore Live records times; it doesn’t grade the work.</p>
              <p>AI drafts rows and wording. A coordinator confirms every row and every hour.</p>
              <p>Keep what you use for sign-ups. SycaMore Live starts at the sign-in table.</p>
            </More>
          </ChipBand>
        </Section>
      </StepBar>

      <CtaBand
        title="Set up your organization in a minute."
        text="You’ll land on a practice event and a short course."
        secondary={{ href: '/signin', label: 'Sign in' }}
        note="Free while SycaMore Live is a student demo."
      />
    </>
  );
}
