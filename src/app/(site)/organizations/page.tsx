import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, Illo, PageHero, SectionHead, siteStyles as ss } from '@/components/site/Blocks';
import { CardGrid, FeatureRow, Facts, MiniCard } from '@/components/site/Feature';
import { Laptop, Photo } from '@/components/site/Frames';
import { VerifyMock } from '@/components/site/Mocks';
import { photo } from '@/components/site/media';
import p from '../pages.module.css';

export const metadata: Metadata = {
  title: 'For organizations',
  description:
    'For volunteer coordinators: a QR code and live roster on event day, a two-minute verify, hour letters you don’t hand-sign, a funder report, walk-in sign-up and paper sheet import.',
};

export default function Organizations() {
  return (
    <>
      <PageHero
        eyebrow="For organizations"
        title={['Run the day.', 'Verify in two minutes.', <em key="e">Stop signing letters.</em>]}
        lede="SycaMore Live is built for the coordinator at the sign-in table: the person who vouches for every hour, usually with a clipboard and no time."
        art={
          <div className={p.heroPhoto}>
            <Photo
              src={photo('audience-coordinator')}
              alt="A volunteer coordinator holding a tablet at an outdoor event"
              sizes="(min-width: 960px) 520px, 92vw"
              ratio="4 / 5"
              priority
            />
          </div>
        }
      >
        <div className={ss.ctas}>
          <Link href="/org/start" className="btn btn-primary btn-big">
            Set up your organization
          </Link>
          <Link href="/org/login" className="btn btn-big">
            Sign in
          </Link>
        </div>
      </PageHero>

      <section className={p.block} aria-labelledby="org-benefits">
        <div className={ss.wrap}>
          <SectionHead eyebrow="What you get" title="Less paperwork, and a record you can stand behind." id="org-benefits" />
          <CardGrid cols={3}>
            <MiniCard icon={<Illo name="sapling" size={64} />} title="Set up in a minute">
              <p>Four boxes, a practice event and a 7-minute course that teaches by doing.</p>
            </MiniCard>
            <MiniCard icon={<Illo name="compass" size={64} />} title="Event day without a clipboard">
              <p>A full-screen QR code, a live roster, and Add by name for anyone without a phone.</p>
            </MiniCard>
            <MiniCard icon={<Illo name="seed-pod" size={64} />} title="Walk-ins handled">
              <p>A second code signs walk-ins up and checks them in at once. Under-13s are refused.</p>
            </MiniCard>
            <MiniCard icon={<Illo name="ledger" size={64} />} title="Paper sheets, imported">
              <p>Photograph a sign-in sheet. Claude drafts the rows; nothing saves until you confirm each one.</p>
            </MiniCard>
            <MiniCard icon={<Illo name="envelope" size={64} />} title="Hour letters, printed">
              <p>One letter per volunteer with the fields schools ask for. No more hand-signing from memory.</p>
            </MiniCard>
            <MiniCard icon={<Illo name="leaf-badge" size={64} />} title="Badges you sign">
              <p>The system finds who meets a rule; you sign each badge, with a note where it asks for one.</p>
            </MiniCard>
          </CardGrid>
        </div>
      </section>

      <div className={p.tint}>
        <div className={ss.wrap}>
          <FeatureRow id="verify" eyebrow="The two-minute verify" title="Every hour pre-filled. Every change explained." art={<VerifyMock />}>
            <p>When the event ends, open Verify. Hours are already there from the scans; you’re checking, not typing.</p>
            <Facts
              items={[
                'One tap fills in everyone who didn’t scan out, with the reason printed on their record.',
                'Any changed hour needs a reason.',
                'Shifts over 8 hours and duplicate names are flagged.',
                'A 30-second post-event check, then Verify & close. The rows become read-only.',
              ]}
            />
          </FeatureRow>

          <FeatureRow
            id="report"
            eyebrow="Funder report"
            title="The numbers a funder asks for, straight from the data."
            flip
            art={<Laptop name="org-dashboard" />}
          >
            <p>
              The dashboard and the funder report show observed facts, not a score: verified hours, attendances, unique volunteers, events, and
              how many events you verified within 24 hours of ending.
            </p>
            <Facts
              items={[
                'Value of volunteer time at Independent Sector’s 2025 preliminary rate: $36.14 an hour nationally, $41.75 in California.',
                'Print to PDF or download a CSV.',
                'Volunteers who haven’t come in 30+ days are listed as a plain fact, with a ready-to-send invite.',
              ]}
            />
          </FeatureRow>

          <FeatureRow id="letters" eyebrow="Hour letters" title="The letter a school asks for, without the signing session." art={<Laptop name="hour-letter" />}>
            <p>
              Each letter lists your organization and coordinator contact, each event’s date, role and hours, any adjustment reasons, the
              verification dates and a signature line. And every hour on it also has a public record a school can check on its own.
            </p>
          </FeatureRow>
        </div>
      </div>

      <section className={p.block} aria-labelledby="org-honest">
        <div className={ss.wrap}>
          <SectionHead
            eyebrow="Straight answers"
            title="What it won’t do for you."
            id="org-honest"
            lede="Being clear about the edges is part of why a record is worth anything."
            split
          />
          <CardGrid cols={3}>
            <MiniCard title="It won’t vouch for you">
              <p>The record is your organization’s statement. SycaMore Live records times; it doesn’t observe or grade the work.</p>
            </MiniCard>
            <MiniCard title="It won’t decide for you">
              <p>AI drafts rows from a paper sheet and wording for a story. A coordinator confirms every row and every hour.</p>
            </MiniCard>
            <MiniCard title="It won’t replace your sign-up tool">
              <p>Keep SignUpGenius or whatever you use. SycaMore Live starts at the sign-in table.</p>
            </MiniCard>
          </CardGrid>
        </div>
      </section>

      <CtaBand
        title="Set up your organization in a minute."
        text="You’ll land on a practice event and a short course that teaches the rest by doing. Already set up? Sign in with your coordinator PIN."
        secondary={{ href: '/org/login', label: 'Coordinator sign in' }}
      />
    </>
  );
}
