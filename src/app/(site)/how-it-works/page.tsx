import Link from 'next/link';
import { CtaBand, Facts, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { Chips, More } from '@/components/site/Chips';
import { ArtWell, FeatureRow } from '@/components/site/Feature';
import { Shot } from '@/components/site/Frames';
import { CheckInMock, MyHoursMock, PasteMock, ShareMock, VerifyMock } from '@/components/site/Drawings';
import { pageMeta } from '@/components/site/meta';
import { StepBar } from '@/components/site/StepBar';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'How it works',
  'One volunteer event from start to record: set-up, the QR card and live roster, walk-ins, paper sheets, a two-minute verify and the volunteer’s side.',
  '/how-it-works',
);

// Six steps, one claim each. The caption carries the claim; the detail sits
// behind "More detail" so the page reads in a minute and still answers the
// careful reader.

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={['One event,', <>start to <em>record</em>.</>]}
        lede="Five steps at the sign-in table, one in the volunteer’s pocket."
        motif="fern"
      />

      <StepBar
        label="Steps on this page"
        steps={[
          { id: 'setup', label: 'Set up' },
          { id: 'event-day', label: 'Event day' },
          { id: 'paper', label: 'Paper sheets' },
          { id: 'verify', label: 'Verify' },
          { id: 'letters', label: 'Letters' },
          { id: 'volunteer', label: 'The volunteer' },
        ]}
      >
        <Section id="coordinators" label="For coordinators">
          <FeatureRow id="setup" eyebrow="01 · Before" title="Four boxes, then a practice run." art={<ArtWell><div className={p.mockW}><PasteMock /></div></ArtWell>}>
            <p>Paste an invite. The event form fills itself.</p>
            <Chips items={['About a minute', 'Practice event', '7-minute course']} />
            <More>
              <Facts
                items={[
                  'Paste a message, link or calendar invite.',
                  'Anything uncertain is marked amber. Nothing saves until you press Create.',
                  'Every event gets a public page with a map and add-to-calendar.',
                ]}
              />
            </More>
          </FeatureRow>

          <FeatureRow id="event-day" eyebrow="02 · Event day" title="One QR code. A roster that fills itself." flip art={<Shot name="event-day" />}>
            <p>Volunteers scan with their own phones.</p>
            <Chips items={['Walk-ins sign up here', 'No phone? Add by name']} />
            <More>
              <Facts
                items={[
                  'Show the code full-screen or print the sign.',
                  'Check-in opens 2 hours before the start and closes 2 hours after the end.',
                  'Flip the card to New here: one scan signs a walk-in up and checks them in. Under 13 is refused.',
                  'Make a new link and every old photo or print of it stops working.',
                  'Optional and off by default: a leave-the-area check. No coordinates are stored.',
                ]}
              />
            </More>
          </FeatureRow>

          <FeatureRow id="paper" eyebrow="03 · After" title="Still have a paper sheet? Photograph it." art={<Shot name="sheet-import" />}>
            <p>Claude drafts the rows. You confirm each one.</p>
            <Chips items={['Unsure rows in amber', 'Blanks stay blank']} />
            <More>
              <Facts items={['Nothing is saved until you confirm each row.', 'A blank check-out is never invented.', 'Text on the sheet is treated as data, never as instructions.']} />
            </More>
          </FeatureRow>

          <FeatureRow id="verify" eyebrow="04 · After" title="Verify in about two minutes." flip art={<ArtWell><div className={p.mockW}><VerifyMock /></div></ArtWell>}>
            <p>Hours arrive pre-filled. Every change needs a reason.</p>
            <Chips items={['One-tap fill-in', 'Rows lock on verify']} />
            <More>
              <Facts
                items={[
                  'One tap fills in anyone who didn’t scan out; the reason prints on their record.',
                  'Shifts over 8 hours and duplicate names are flagged.',
                  'Once verified, the rows are read-only.',
                ]}
              />
            </More>
          </FeatureRow>

          <FeatureRow id="letters" eyebrow="05 · After" title="Hour letters without the signing session." art={<Shot name="hour-letter" />}>
            <p>A letter per volunteer, plus a funder report.</p>
            <Chips items={['PDF or CSV', 'Fields schools ask for']} />
          </FeatureRow>
        </Section>

        <Section id="volunteers" well label="For volunteers">
          <FeatureRow
            id="volunteer"
            eyebrow="06 · The volunteer"
            title="Scan in, scan out, share."
            flip
            art={
              <ArtWell>
                <div className={p.mockStack}>
                  <CheckInMock />
                  <MyHoursMock />
                  <ShareMock />
                </div>
              </ArtWell>
            }
          >
            <p>Their phone is the sign-in sheet. No app.</p>
            <Chips items={['Never types an hour', 'Waiting until verified', 'A link anyone can check']} />
            <More>
              <Facts
                items={[
                  'First time? Join in one step and land back on the check-in.',
                  'Ages 13 to 17 confirm a parent or guardian knows. Sharing needs a guardian’s OK.',
                  'AI can draft a resume line from the record’s facts. The volunteer edits it.',
                  <>
                    Discover, badges, messages and account: <Link href="/volunteers">For volunteers</Link>.
                  </>,
                ]}
              />
            </More>
          </FeatureRow>
        </Section>
      </StepBar>

      <div className={`${ss.wrap} ${p.more}`}>
        <TextLink href="/trust">What the record says, line by line</TextLink>
      </div>
      <CtaBand title="See it on your next event." text="Set-up takes about a minute." />
    </>
  );
}
