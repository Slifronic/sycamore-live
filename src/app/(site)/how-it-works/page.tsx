import Link from 'next/link';
import { CtaBand, Facts, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { ArtWell, CardGrid, FeatureRow, MiniCard } from '@/components/site/Feature';
import { Shot } from '@/components/site/Frames';
import { CheckInMock, MyHoursMock, PasteMock, RosterMock, ShareMock, VerifyMock } from '@/components/site/Drawings';
import { pageMeta } from '@/components/site/meta';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'How it works',
  'One volunteer event from start to record: set up, the QR code and live roster, walk-ins, paper sheets, a two-minute verify, hour letters, and the volunteer’s side.',
  '/how-it-works',
);

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={['One event,', <>start to <em>record</em>.</>]}
        lede="What SycaMore Live does today, in the order it happens."
      >
        <nav aria-label="On this page" className={p.jump}>
          <a href="#coordinators">Coordinators</a>
          <a href="#volunteers">Volunteers</a>
        </nav>
      </PageHero>

      <Section id="coordinators" eyebrow="For coordinators" title="Before, during and after the event.">
        <FeatureRow id="setup" eyebrow="Before · Set up" title="Four boxes, then a practice run." art={<ArtWell><div className={p.mockW}><PasteMock /></div></ArtWell>}>
          <p>Set-up takes about a minute, then a practice event and a 7-minute course teach the rest by doing.</p>
          <Facts
            items={[
              'Paste a message, link or calendar invite: the event form fills itself.',
              'Anything uncertain is marked amber. Nothing saves until you press Create.',
              'Every event gets a public page with a map and add-to-calendar.',
            ]}
          />
        </FeatureRow>

        <FeatureRow id="event-day" eyebrow="During · Event day" title="One QR code on a screen. A roster that fills itself." flip art={<Shot name="event-day" />}>
          <p>Show the code full-screen or print the sign. Volunteers scan with their own phones, and the roster updates as they arrive.</p>
          <Facts
            items={[
              'Check-in opens 2 hours before the start and closes 2 hours after the end.',
              'No phone? Add them by name.',
              'Optional and off by default: a leave-the-area check. No coordinates are stored.',
            ]}
          />
        </FeatureRow>

        <FeatureRow id="walk-ins" eyebrow="During · Walk-ins" title="People who just show up get their own code." art={<ArtWell><div className={p.mockW}><RosterMock /></div></ArtWell>}>
          <p>A second code signs walk-ins up and checks them in, in one step. They show on the roster as “Signed up at the door”.</p>
          <Facts items={['Under 13 is refused, and nothing is stored.', 'Make a new link and every old photo or print of it stops working.']} />
        </FeatureRow>

        <FeatureRow id="paper" eyebrow="After · Paper sheets" title="Still have a paper sheet? Photograph it." flip art={<Shot name="sheet-import" />}>
          <p>
            Claude drafts one row per person and marks unsure rows amber. <strong>Nothing is saved until you confirm each row.</strong>
          </p>
          <Facts items={['A blank check-out stays blank; it’s never invented.', 'Text on the sheet is treated as data, never as instructions.']} />
        </FeatureRow>

        <FeatureRow id="verify" eyebrow="After · Verify" title="Close the event and verify in about two minutes." art={<ArtWell><div className={p.mockW}><VerifyMock /></div></ArtWell>}>
          <p>Hours arrive pre-filled from the scans. One tap fills in anyone who didn’t scan out, and the reason is printed on their record.</p>
          <Facts items={['Any changed hour needs a reason.', 'Shifts over 8 hours and duplicate names are flagged.', 'Once verified, the rows are read-only.']} />
        </FeatureRow>

        <FeatureRow id="letters" eyebrow="After · Letters and reports" title="Hour letters without the signing session." flip art={<Shot name="hour-letter" />}>
          <p>A printable letter per volunteer with the fields schools ask for, and a funder report with the totals, as a PDF or CSV.</p>
        </FeatureRow>
      </Section>

      <Section id="volunteers" well eyebrow="For volunteers" title="Scan in, serve, scan out, share.">
        <FeatureRow id="checkin" eyebrow="At the event" title="Your phone is the sign-in sheet." art={<ArtWell><div className={p.mockW}><CheckInMock /></div></ArtWell>}>
          <p>Scan the code at the table. First time? Join in one step and you land straight back on the check-in.</p>
          <Facts items={['No app to install: it’s a web page.', 'You never type your hours.']} />
        </FeatureRow>

        <FeatureRow id="record" eyebrow="After the event" title="Confirmed hours, and a link anyone can check." flip art={<ArtWell><div className={p.mockStack}><MyHoursMock /><ShareMock /></div></ArtWell>}>
          <p>Until the organization verifies, an event shows as waiting, with no number. Then it becomes a record you can share or print.</p>
          <Facts items={['Under 18? Sharing needs a guardian’s OK first.', 'AI can draft a resume line from the record’s facts. You edit it.']} />
        </FeatureRow>

        <CardGrid cols={3}>
          <MiniCard icon="compass" title="Discover">
            <p>Upcoming public events from every organization, ranked by what you want to do.</p>
            <p>
              <Link href="/discover">Open Discover</Link>
            </p>
          </MiniCard>
          <MiniCard icon="award" title="Badges">
            <p>The system finds who meets a rule; a coordinator signs each badge. No skill claims.</p>
          </MiniCard>
          <MiniCard icon="message" title="Messages">
            <p>Announcements and event chats in one inbox. Under 18 gets announcements only.</p>
          </MiniCard>
        </CardGrid>
      </Section>

      <div className={`${ss.wrap} ${p.more}`}>
        <TextLink href="/trust">What the record says, line by line</TextLink>
      </div>
      <CtaBand title="See it on your next event." />
    </>
  );
}
