import type { Metadata } from 'next';
import { CtaBand, PageHero, SectionHead, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { CardGrid, MiniCard } from '@/components/site/Feature';
import { RecordPreview } from '@/components/site/RecordPreview';
import { Reveal, RevealGroup } from '@/components/site/Reveal';
import { featuredRecord } from '@/components/site/featured-record';
import { fmtHours } from '@/lib/hours';
import type { RecordView } from '@/lib/types';
import { longDate, roleWords } from '@/components/vol/RecordWording';
import p from '../pages.module.css';

export const metadata: Metadata = {
  title: 'Trust and the record',
  description:
    'What a SycaMore Live record says, line by line: who is vouching, captured versus adjusted hours, revocation, what AI does and doesn’t do, and how minors’ data and location are handled.',
};

const lines = (r: RecordView | null) => [
  {
    q: (
      <>
        <mark>{r?.org.name ?? 'The organization'}</mark> states that…
      </>
    ),
    why: 'The organization is the one making the claim. SycaMore Live is the tool it used to record times; the record names the organization and how to reach it.',
  },
  {
    q: (
      <>
        …<mark>{r?.volunteer_name ?? 'the volunteer'}</mark> served as <mark>{r ? roleWords(r.role) : 'their role'}</mark>…
      </>
    ),
    why: 'The volunteer’s name from their account, and the role the coordinator chose when verifying.',
  },
  {
    q: (
      <>
        …at <mark>{r?.event.title ?? 'the event'}</mark> on <mark>{r ? longDate(r.event.date) : 'the date'}</mark>…
      </>
    ),
    why: 'The event as the organization created it. Practice events never produce a record.',
  },
  {
    q: (
      <>
        …for <mark>{r ? fmtHours(r.hours_total) : 'N'} attested hours</mark>: {r ? fmtHours(r.hours_captured) : 'N'} captured by check-in and check-out…
      </>
    ),
    why: 'Captured hours come from the volunteer’s own scans, timed on the server. Volunteers can’t type or edit hours.',
  },
  {
    q: <>…adjusted to 2.5 by the coordinator: “Left at 11:30 for a work shift”…</>,
    why: 'Only appears if the coordinator changed the hours (this line is an example), and a change can’t be saved without a reason. Both numbers stay visible.',
  },
  {
    q: <>The organization confirmed this when it closed the event.</>,
    why: 'Verifying closes the event. From then on a database rule keeps the attested rows read-only.',
  },
  {
    q: <>SycaMore Live recorded these hours and did not observe the work itself.</>,
    why: 'The fine print on every record. It records times and who vouched; it doesn’t grade the service.',
  },
];

export default async function Trust() {
  const record = await featuredRecord();
  const href = record?.code ? `/v/${record.code}` : null;
  return (
    <>
      <PageHero
        eyebrow="Trust"
        title={['What the record says,', <em key="e">and what it doesn’t.</em>]}
        lede="A volunteer record is only worth something if a stranger can tell who is vouching for it and how the numbers were made. Here is every line, and every rule behind it."
      >
        {href && <TextLink href={href}>Open a live verified record</TextLink>}
      </PageHero>

      <section className={p.block} aria-labelledby="line-by-line" style={{ paddingTop: 0 }}>
        <div className={`${ss.wrap} ${p.wordingGrid}`}>
          <Reveal className={p.wordingSticky}>
            <p className={ss.eyebrow}>The record wording</p>
            <h2 className={ss.h2} id="line-by-line" style={{ fontSize: 'clamp(28px, 3.2vw, 42px)' }}>
              Line by line.
            </h2>
            <RecordPreview r={record} />
          </Reveal>
          <RevealGroup as="ol" className={p.lines} itemAs="li" itemClassName={p.line} step={50}>
            {lines(record).map((l, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <p className={p.quoteLine}>{l.q}</p>
                <p className={p.lineWhy}>{l.why}</p>
              </div>
            ))}
          </RevealGroup>
        </div>
      </section>

      <div className={p.tint}>
        <div className={ss.wrap}>
          <SectionHead
            eyebrow="Captured and adjusted"
            title="Two numbers, side by side, so nothing is quietly rounded."
            id="captured"
            lede="If a volunteer forgot to scan out, or left early, the coordinator can change the hours before verifying. The record keeps both numbers and the reason."
            split
          />
          <RevealGroup className={p.hoursDemo}>
            <div className={p.hoursCard}>
              <p className={ss.eyebrow}>Captured</p>
              <p className={p.hoursNum}>
                3<small>hours</small>
              </p>
              <p>From the volunteer’s check-in and check-out scans. Nobody types this number.</p>
            </div>
            <div className={p.hoursCard}>
              <p className={ss.eyebrow}>Adjusted, with a reason</p>
              <p className={p.hoursNum}>
                2.5<small>hours</small>
              </p>
              <p>
                “Left at 11:30 for a work shift; confirmed with them by phone.” The coordinator’s name and the reason are printed on the record.
                An example, not a real person.
              </p>
            </div>
          </RevealGroup>
        </div>
      </div>

      <section className={p.block} aria-labelledby="verify-page">
        <div className={`${ss.wrap} ${p.storyGrid}`}>
          <Reveal className={p.prose}>
            <p className={ss.eyebrow}>The verification page</p>
            <h2 className={ss.h2} id="verify-page">
              Anyone with the link can check. Nobody can edit.
            </h2>
            <p>
              A share link opens a public page at <strong>/v/&lt;code&gt;</strong>. It needs no account, sets no cookie and asks search engines not
              to index it. A code that doesn’t exist is a plain “not found”.
            </p>
            <p>
              If an organization withdraws a record, the same link says <strong>REVOKED</strong> and tells the reader to contact the organization.
              Verified hours are never edited in place.
            </p>
          </Reveal>
          <Reveal className={p.banners} delay={80}>
            <div className={p.bannerOk}>
              <strong>VERIFIED · issued by the organization</strong>
              <span>Confirmed when the organization closed the event.</span>
            </div>
            <div className={p.bannerBad}>
              <strong>REVOKED</strong>
              <span>The organization has withdrawn this record. Contact them for details.</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={p.block} aria-labelledby="ai" style={{ paddingTop: 0 }}>
        <div className={ss.wrap}>
          <SectionHead eyebrow="AI" title="AI drafts. People decide." id="ai" />
          <div className={p.compare}>
            <Reveal className={`${p.compareCard} ${p.compareDo}`}>
              <h3>What AI does</h3>
              <ul>
                <li><span className={`${p.mark} ${p.markYes}`}>✓</span>Drafts rows from a photo of a paper sign-in sheet, marking unsure rows amber.</li>
                <li><span className={`${p.mark} ${p.markYes}`}>✓</span>Fills a new event form from a pasted message, link or flyer photo.</li>
                <li><span className={`${p.mark} ${p.markYes}`}>✓</span>Drafts a resume line or scholarship sentence from a record’s facts, for the volunteer to edit.</li>
                <li><span className={`${p.mark} ${p.markYes}`}>✓</span>Drafts an event story from the coordinator’s own debrief and the verified facts.</li>
              </ul>
            </Reveal>
            <Reveal className={`${p.compareCard} ${p.compareDont}`} delay={80}>
              <h3>What AI never does</h3>
              <ul>
                <li><span className={`${p.mark} ${p.markNo}`}>✕</span>Save a row: nothing from a sheet is stored until a coordinator confirms it.</li>
                <li><span className={`${p.mark} ${p.markNo}`}>✕</span>Invent a check-out time. A blank on the sheet stays blank.</li>
                <li><span className={`${p.mark} ${p.markNo}`}>✕</span>Add numbers. Drafted wording is checked, and any number not in the record is rejected or flagged.</li>
                <li><span className={`${p.mark} ${p.markNo}`}>✕</span>Verify hours or sign badges. Only a coordinator can.</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <div className={p.tint}>
        <div className={ss.wrap}>
          <SectionHead eyebrow="Minors and location" title="Collected only when needed, and kept small." id="data" />
          <CardGrid cols={3}>
            <MiniCard title="Under 13">
              <p>Refused at sign-up, at the door and online. Nothing is stored.</p>
            </MiniCard>
            <MiniCard title="Ages 13 to 17">
              <p>They keep their hours, but a record can’t be shared without a guardian’s OK; the server refuses.</p>
            </MiniCard>
            <MiniCard title="Messages for minors">
              <p>Announcements only. No event group chats and no direct messages with coordinators, in either direction.</p>
            </MiniCard>
            <MiniCard title="Location is opt-in">
              <p>The leave-the-area check is off for every event until a coordinator turns it on, and off for every volunteer until they do.</p>
            </MiniCard>
            <MiniCard title="No coordinates stored">
              <p>Only when someone left the area and roughly how far is kept, vague GPS fixes are ignored, and verifying wipes it all.</p>
            </MiniCard>
            <MiniCard title="Nobody is checked out automatically">
              <p>A “left the area” note is a suggestion the coordinator can accept, with a printed reason.</p>
            </MiniCard>
          </CardGrid>
        </div>
      </div>

      <CtaBand title="Put your next event on the record." />
    </>
  );
}
