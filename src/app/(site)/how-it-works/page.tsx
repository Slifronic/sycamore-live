import type { Metadata } from 'next';
import { CtaBand, Illo, PageHero, SectionHead, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { FeatureRow, Facts, JumpNav } from '@/components/site/Feature';
import { Laptop, Phone, Photo } from '@/components/site/Frames';
import { QrCard, RosterMock, VerifyMock } from '@/components/site/Mocks';
import { photo } from '@/components/site/media';
import p from '../pages.module.css';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'A walk-through of SycaMore Live for coordinators and volunteers: event-day QR and live roster, walk-in sign-up, paper sheet import, verifying in two minutes, hour letters, the public record, Discover and messages.',
};

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={['One event,', <>start to <em>record</em>.</>]}
        lede="Everything below is what SycaMore Live does today, in the order it happens: first from the coordinator’s side of the sign-in table, then from the volunteer’s."
        art={
          <div className={p.heroStack}>
            <Laptop name="org-dashboard" sizes="(min-width: 960px) 560px, 92vw" priority />
            <Phone name="checkin-phone" className={p.heroPhone} sizes="(min-width: 960px) 180px, 34vw" />
          </div>
        }
      />

      <div>
        <JumpNav
          className={ss.wrap}
          label="On this page"
          links={[
            { href: '#setup', label: 'Set up' },
            { href: '#event-day', label: 'Event day' },
            { href: '#walk-ins', label: 'Walk-ins' },
            { href: '#paper', label: 'Paper sheets' },
            { href: '#verify', label: 'Verify' },
            { href: '#letters', label: 'Letters & reports' },
            { href: '#checkin', label: 'Volunteers' },
            { href: '#discover', label: 'Discover' },
            { href: '#messages', label: 'Messages' },
          ]}
        />
      <div className={ss.wrap}>
        <SectionHead eyebrow="For coordinators" title="Before, during and after the event." id="coordinators" />

        <FeatureRow
          id="setup"
          eyebrow="Before · Set up"
          title="Four boxes, then a practice run."
          art={
            <div className={p.illoPanel}>
              <Illo name="compass" size={150} />
              <div className={p.illoNote}>
                <p className={p.noteTitle}>New event, from what you already have</p>
                <p>Drop in a calendar invite, an Eventbrite or Meetup link, a group-chat message or a photo of a flyer. The form fills itself; nothing saves until you press Create.</p>
              </div>
            </div>
          }
        >
          <p>
            Setting up an organization takes about a minute. You land on a practice event and a 7-minute course that teaches by doing: each
            lesson opens the real screen and completes itself when you do the action.
          </p>
          <Facts
            items={[
              'Imported fields are tinted, and anything uncertain is marked amber.',
              'Pasted links are fetched only from public addresses, with a size cap and a timeout.',
              'Repeat a past event: same place, hours, notes and tags, next week.',
              'Every event gets a public page with a map, directions and add-to-calendar. The check-in code is not on it.',
            ]}
          />
        </FeatureRow>

        <FeatureRow
          id="event-day"
          eyebrow="During · Event day"
          title="One QR code on a screen. A roster that fills itself."
          flip
          art={
            <div className={p.layered}>
              <Laptop name="event-day" />
              <RosterMock className={p.layerRoster} />
            </div>
          }
        >
          <p>
            Open the event and put its QR code full-screen, or print the two-page sign. Volunteers scan with their own phones; the live roster
            updates every few seconds. Someone without a phone? <strong>Add by name</strong>.
          </p>
          <Facts
            items={[
              'Check-in opens 2 hours before the start and closes 2 hours after the end.',
              'Practice events never match a real check-in.',
              'Optional, off by default: a leave-the-area check that notices when an opted-in volunteer left early. No coordinates are stored.',
            ]}
          />
        </FeatureRow>

        <FeatureRow
          id="walk-ins"
          eyebrow="During · Walk-in sign-up"
          title="People who just show up get their own code."
          art={
            <div className={p.phonePair}>
              <Phone name="checkin-phone" />
              <QrCard className={p.pairQr} />
            </div>
          }
        >
          <p>
            Under the check-in code sits a second one for walk-ins. Scanning it signs them up (with Google, or name, email and birth date) and
            checks them in to the event in the same step. They show on the roster as “Signed up at the door”.
          </p>
          <Facts
            items={[
              'Under 13 is refused, and nothing is stored.',
              'Ages 13 to 17 are told that sharing will need a guardian’s OK.',
              'An email that’s already signed up needs its matching birth date.',
              'Turn the link off or make a new one, and every photo or print of the old one stops working.',
            ]}
          />
        </FeatureRow>

        <FeatureRow
          id="paper"
          eyebrow="After · Paper sheet import"
          title="Still have a paper sheet? Photograph it."
          flip
          art={
            <div className={p.layered}>
              <Laptop name="sheet-import" />
              <span className={p.layerIllo}>
                <Illo name="ledger" size={120} />
              </span>
            </div>
          }
        >
          <p>
            Claude reads the photo and drafts one row per person. Rows it isn’t sure about are amber. <strong>Nothing is saved until you
            confirm each row.</strong>
          </p>
          <Facts
            items={[
              'Claude never invents a check-out time; a blank stays blank.',
              'Text on the sheet is treated as data, never as instructions.',
              'On three synthetic test sheets, 19 of 19 rows were right before review. A test on real handwriting is still pending.',
            ]}
          />
        </FeatureRow>

        <FeatureRow
          id="verify"
          eyebrow="After · Verify"
          title="Close the event and verify in about two minutes."
          art={<VerifyMock />}
        >
          <p>
            Hours arrive pre-filled from the scans. Pick roles, star standouts, and fill in anyone who didn’t scan out with one tap: their
            record prints the reason.
          </p>
          <Facts
            items={[
              'Any changed hour needs a reason, and the record shows captured and adjusted hours side by side.',
              'Shifts over 8 hours and duplicate names are flagged before you close.',
              'Once verified, a database rule makes the rows read-only.',
            ]}
          />
        </FeatureRow>

        <FeatureRow
          id="letters"
          eyebrow="After · Letters and reports"
          title="Hour letters you don’t have to hand-sign, and a report for funders."
          flip
          art={<Laptop name="hour-letter" />}
        >
          <p>
            Each volunteer gets a printable <strong>hour letter</strong> with the fields schools ask for: your organization and contact, each
            event’s date, role and hours, any adjustment reasons, the verification dates and a signature line.
          </p>
          <p>
            The <strong>funder report</strong> totals verified hours, unique volunteers, events and the value of volunteer time (Independent
            Sector 2025, preliminary: $36.14 an hour nationally, $41.75 in California). Print it to PDF or download a CSV.
          </p>
        </FeatureRow>
      </div>

      <div className={p.tint}>
        <div className={ss.wrap}>
          <SectionHead eyebrow="For volunteers" title="Scan, serve, scan, share." id="volunteers" />

          <FeatureRow
            id="checkin"
            eyebrow="Check in and out"
            title="Your phone is the sign-in sheet."
            art={<Photo src={photo('audience-volunteer')} alt="A volunteer scanning a QR code at an outdoor sign-in table" sizes="(min-width: 960px) 600px, 92vw" ratio="4 / 3" />}
          >
            <p>
              Scan the code at the sign-in table. First time? Join in one step with your name, email and birth date, and you land straight
              back on the check-in. A running timer shows you’re checked in; tap Check out when you leave.
            </p>
            <Facts
              items={['No app to install: it’s a web page.', 'You never type your hours. They come from your scans and the coordinator’s check.', 'If you forget to check out, the coordinator fills it in with a printed reason.']}
            />
          </FeatureRow>

          <FeatureRow
            id="my-hours"
            eyebrow="My hours and the record"
            title="Confirmed hours, and a link anyone can check."
            flip
            art={
              <div className={p.phonePair}>
                <Phone name="me-phone" />
                <Phone name="record-public" className={p.pairBack} />
              </div>
            }
          >
            <p>
              <strong>My hours</strong> shows attested hours, events and organizations. Until the coordinator verifies, an event shows as
              “Waiting for the organization to confirm”, with no number.
            </p>
            <Facts
              items={[
                'Each record has a share link (SYC-XXXX-XXXX) with a QR code, and prints to PDF.',
                'Badges are signed by a coordinator, with the rule and their note. They make no skill claims.',
                'AI can draft a resume line from the record’s facts only. You edit it before you use it.',
                'Under 18? Sharing needs a guardian’s OK, and the record can’t be shared until then.',
              ]}
            />
          </FeatureRow>

          <FeatureRow
            id="discover"
            eyebrow="Discover"
            title="Find your next event."
            art={
              <div className={p.covers}>
                {(['cover-planting', 'cover-food', 'cover-cleanup', 'cover-tutoring'] as const).map((c) => (
                  <Photo key={c} src={photo(c, true)} alt="" sizes="(min-width: 960px) 280px, 45vw" ratio="1" />
                ))}
              </div>
            }
          >
            <p>
              Discover lists upcoming public events from every organization, ranked in your browser by what you want: use your experience,
              learn something new, or follow your interests.
            </p>
            <Facts
              items={[
                'The fit is rule-based and shows its range. It is not a probability.',
                'Pasted resume text stays in the page’s memory; it’s never sent or stored.',
                'Save events for later. There’s no sign-up: you check in when you get there.',
              ]}
            />
            <p>
              <TextLink href="/discover">Open Discover</TextLink>
            </p>
          </FeatureRow>

          <FeatureRow
            id="messages"
            eyebrow="Messages"
            title="Announcements, event chats and a direct line."
            flip
            art={
              <div className={p.illoPanel}>
                <Illo name="envelope" size={150} />
                <div className={p.illoNote}>
                  <p className={p.noteTitle}>Under 18</p>
                  <p>Volunteers under 18 get the organization’s announcements only: no event group chats and no direct messages, in either direction.</p>
                </div>
              </div>
            }
          >
            <p>
              Coordinators send broadcasts and automatic notices, and each event has a group chat. Volunteers see their threads in one inbox
              next to their hours.
            </p>
          </FeatureRow>
        </div>
      </div>
      </div>

      <CtaBand title="See it on your next event." />
    </>
  );
}
