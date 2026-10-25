import { CtaBand, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { CardGrid, MiniCard } from '@/components/site/Feature';
import { RecordPreview } from '@/components/site/RecordPreview';
import { Reveal, RevealGroup } from '@/components/site/Reveal';
import { featuredRecord } from '@/components/site/featured-record';
import { pageMeta } from '@/components/site/meta';
import { Icon } from '@/components/shell/icons';
import { fmtHours } from '@/lib/hours';
import type { RecordView } from '@/lib/types';
import { longDate, roleWords } from '@/components/vol/RecordWording';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'Trust and the record',
  'What a SycaMore Live record says, line by line: who is vouching, captured and adjusted hours, revocation, what AI does and doesn’t do, and how minors are protected.',
  '/trust',
);

const lines = (r: RecordView | null) => [
  {
    q: (
      <>
        <mark>{r?.org.name ?? 'The organization'}</mark> states that…
      </>
    ),
    why: 'The organization makes the claim. SycaMore Live is the tool it used to record the times.',
  },
  {
    q: (
      <>
        …<mark>{r?.volunteer_name ?? 'the volunteer'}</mark> served as <mark>{r ? roleWords(r.role) : 'their role'}</mark>…
      </>
    ),
    why: 'The name from the volunteer’s account, and the role the coordinator chose at verify.',
  },
  {
    q: (
      <>
        …at <mark>{r?.event.title ?? 'the event'}</mark> on <mark>{r ? longDate(r.event.date) : 'the date'}</mark>…
      </>
    ),
    why: 'The event as the organization created it. Practice events never make a record.',
  },
  {
    q: (
      <>
        …for <mark>{r ? fmtHours(r.hours_total) : 'N'} hours</mark>, captured by check-in and check-out.
      </>
    ),
    why: 'Timed on the server from the volunteer’s own scans. Volunteers can’t type or edit hours.',
  },
  {
    q: <>The organization confirmed this when it closed the event.</>,
    why: 'Verifying closes the event. From then on, a database rule keeps the rows read-only.',
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
        lede="A record is worth something only if a stranger can tell who vouches for it."
      >
        {href && <TextLink href={href}>Open a live verified record</TextLink>}
      </PageHero>

      <Section id="wording" eyebrow="The record wording" title="Line by line.">
        <div className={p.wordingGrid}>
          <Reveal className={p.wordingSticky}>
            <RecordPreview r={record} />
          </Reveal>
          <RevealGroup as="ol" className={p.lines} itemAs="li" itemClassName={p.line} step={50}>
            {lines(record).map((l, i) => (
              <div key={i} className={p.lineInner}>
                <p className={p.quoteLine}>{l.q}</p>
                <p className={p.lineWhy}>{l.why}</p>
              </div>
            ))}
          </RevealGroup>
        </div>
      </Section>

      <Section id="captured" well eyebrow="Captured and adjusted" title="Two numbers, side by side, so nothing is quietly rounded.">
        <div className={p.hoursDemo}>
          <Reveal className={p.hoursCard}>
            <p className={ss.eyebrow}>Captured</p>
            <p className={p.hoursNum}>
              3<small>hours</small>
            </p>
            <p>From the volunteer’s check-in and check-out scans. Nobody types this number.</p>
          </Reveal>
          <Reveal className={p.hoursCard} delay={60}>
            <p className={ss.eyebrow}>Adjusted, with a reason</p>
            <p className={p.hoursNum}>
              2.5<small>hours</small>
            </p>
            <p>“Left at 11:30 for a work shift.” The reason is printed on the record. (An example.)</p>
          </Reveal>
        </div>
      </Section>

      <Section id="verify-page" eyebrow="The verification page" title="Anyone with the link can check. Nobody can edit.">
        <div className={p.banners}>
          <Reveal className={p.bannerOk}>
            <strong>
              <Icon name="check" size={20} /> Verified
            </strong>
            <span>Confirmed when the organization closed the event. No account needed to read it, and search engines are asked not to index it.</span>
          </Reveal>
          <Reveal className={p.bannerBad} delay={60}>
            <strong>
              <Icon name="x" size={20} /> Revoked
            </strong>
            <span>If an organization withdraws a record, the same link says so. Verified hours are never edited in place.</span>
          </Reveal>
        </div>
      </Section>

      <Section id="ai" well eyebrow="AI" title="AI drafts. People decide.">
        <div className={p.compare}>
          <Reveal className={p.compareCard}>
            <h3 className={ss.h3}>What AI does</h3>
            <ul>
              <li>
                <Icon name="check" size={18} className={p.yes} />
                Drafts rows from a photo of a paper sign-in sheet.
              </li>
              <li>
                <Icon name="check" size={18} className={p.yes} />
                Fills a new event form from a pasted message, link or flyer.
              </li>
              <li>
                <Icon name="check" size={18} className={p.yes} />
                Drafts a resume line, a broadcast or an event story from the facts.
              </li>
            </ul>
          </Reveal>
          <Reveal className={p.compareCard} delay={60}>
            <h3 className={ss.h3}>What AI never does</h3>
            <ul>
              <li>
                <Icon name="x" size={18} className={p.no} />
                Save a row. A coordinator confirms each one.
              </li>
              <li>
                <Icon name="x" size={18} className={p.no} />
                Invent a time. A blank on the sheet stays blank.
              </li>
              <li>
                <Icon name="x" size={18} className={p.no} />
                Add numbers, verify hours or sign badges.
              </li>
            </ul>
          </Reveal>
        </div>
      </Section>

      <Section id="minors" eyebrow="Minors and location" title="Collected only when needed, and kept small." action={<TextLink href="/privacy">Privacy policy</TextLink>}>
        <CardGrid cols={4}>
          <MiniCard icon="shield" title="Under 13">
            <p>Refused at sign-up, at the door and online. Nothing is stored.</p>
          </MiniCard>
          <MiniCard icon="share" title="Ages 13 to 17">
            <p>They keep their hours; a record can’t be shared without a guardian’s OK.</p>
          </MiniCard>
          <MiniCard icon="message" title="Messages">
            <p>Announcements only for minors. No group chats, no direct messages.</p>
          </MiniCard>
          <MiniCard icon="pin" title="Location">
            <p>Opt-in on both sides. No coordinates stored, and verifying wipes it.</p>
          </MiniCard>
        </CardGrid>
      </Section>

      <CtaBand title="Put your next event on the record." />
    </>
  );
}
