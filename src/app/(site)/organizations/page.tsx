import Link from 'next/link';
import { CtaBand, Facts, PageHero, Section, siteStyles as ss } from '@/components/site/Blocks';
import { ArtWell, CardGrid, FeatureRow, MiniCard } from '@/components/site/Feature';
import { Shot } from '@/components/site/Frames';
import { CoordinatorPath } from '@/components/site/CoordinatorPath';
import { EvidenceCompare } from '@/components/site/Proof';
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
        lede="Built for the coordinator at the sign-in table, who vouches for every hour. Free to start."
        art={<Shot name="event-day" preload sizes="(min-width: 960px) 600px, 92vw" />}
        ambient
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
          { id: 'path', label: 'Your event, start to finish' },
          { id: 'evidence', label: 'Why it holds up' },
          { id: 'get', label: 'What you get' },
          { id: 'detail', label: 'Verify and reports' },
          { id: 'edges', label: 'Straight answers' },
        ]}
      >
      <Section id="path" eyebrow="Start to finish" title="From set-up to the funder report, in four steps.">
        <CoordinatorPath />
      </Section>

      <Section
        id="evidence"
        well
        eyebrow="Why it holds up"
        title="Evidence from the day, not a signature after the fact."
        lede="Your volunteers’ hours are captured while they’re standing there, and you confirm them the same day."
      >
        <EvidenceCompare />
      </Section>

      <Section id="get" eyebrow="What you get" title="Less paperwork, and a record you can stand behind.">
        <CardGrid cols={3}>
          <MiniCard icon="calendar-plus" title="Set up in a minute">
            <p>Four boxes, then a practice event and a short course that teaches by doing.</p>
          </MiniCard>
          <MiniCard icon="scan" title="No clipboard on the day">
            <p>A full-screen QR code, a live roster, and a name box for anyone without a phone.</p>
          </MiniCard>
          <MiniCard icon="users" title="Walk-ins handled">
            <p>The QR card’s New here side signs walk-ins up and checks them in at once.</p>
          </MiniCard>
          <MiniCard icon="clipboard" title="Paper sheets imported">
            <p>Photograph a sheet. Claude drafts the rows; you confirm each one.</p>
          </MiniCard>
          <MiniCard icon="report" title="Letters and a funder report">
            <p>One hour letter per volunteer, and totals a funder can read. PDF or CSV.</p>
          </MiniCard>
          <MiniCard icon="award" title="Badges you sign">
            <p>The system finds who meets a rule. You sign each badge, with a note.</p>
          </MiniCard>
        </CardGrid>
      </Section>

      <Section id="detail" well eyebrow="The parts that matter" title="Checking, not typing.">
        <FeatureRow id="verify" eyebrow="The two-minute verify" title="Every hour pre-filled. Every change explained." art={<ArtWell><div className={p.mockW}><VerifyMock /></div></ArtWell>}>
          <p>When the event ends, the hours are already there from the scans.</p>
          <Facts
            items={['One tap fills in anyone who didn’t scan out, with the reason printed.', 'Any changed hour needs a reason.', 'Verify & close makes the rows read-only.']}
          />
        </FeatureRow>
        <FeatureRow id="report" eyebrow="Letters and reports" title="The letter a school asks for, without the signing." flip art={<Shot name="hour-letter" />}>
          <p>Each letter lists the events, roles, hours, any adjustment reasons and the verification dates.</p>
          <Facts
            items={[
              'The funder report shows observed facts, not a score.',
              'Value of volunteer time at Independent Sector’s 2025 preliminary rate ($41.75 an hour in California).',
            ]}
          />
        </FeatureRow>
      </Section>

      <Section id="edges" eyebrow="Straight answers" title="What it won’t do for you.">
        <CardGrid cols={3}>
          <MiniCard title="It won’t vouch for you">
            <p>The record is your organization’s statement. SycaMore Live records times; it doesn’t grade the work.</p>
          </MiniCard>
          <MiniCard title="It won’t decide for you">
            <p>AI drafts rows and wording. A coordinator confirms every row and every hour.</p>
          </MiniCard>
          <MiniCard title="It won’t replace your sign-up tool">
            <p>Keep what you use for sign-ups. SycaMore Live starts at the sign-in table.</p>
          </MiniCard>
        </CardGrid>
      </Section>
      </StepBar>

      <CtaBand
        title="Set up your organization in a minute."
        text="You’ll land on a practice event and a short course. Already set up? Sign in."
        secondary={{ href: '/signin', label: 'Sign in' }}
      />
    </>
  );
}
