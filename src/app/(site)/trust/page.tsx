import { CtaBand, Facts, PageHero, Section, TextLink } from '@/components/site/Blocks';
import { More } from '@/components/site/Chips';
import { CardGrid, MiniCard } from '@/components/site/Feature';
import { RecordPreview } from '@/components/site/RecordPreview';
import { Reveal, RevealGroup } from '@/components/site/Reveal';
import { featuredRecord } from '@/components/site/featured-record';
import { pageMeta } from '@/components/site/meta';
import { EvidenceCompare, TrustBento } from '@/components/site/Proof';
import { StepBar } from '@/components/site/StepBar';
import { fmtHours } from '@/lib/hours';
import type { RecordView } from '@/lib/types';
import { longDate, roleWords } from '@/components/vol/RecordWording';
import p from '../pages.module.css';

export const metadata = pageMeta(
  'Trust and the record',
  'What a SycaMore Live record says, line by line: who vouches for it, captured and adjusted hours, revocation, what AI does, and how minors are protected.',
  '/trust',
);

const lines = (r: RecordView | null) => [
  {
    q: (
      <>
        <mark>{r?.org.name ?? 'The organization'}</mark> states that…
      </>
    ),
    why: 'The organization makes the claim, not SycaMore Live.',
  },
  {
    q: (
      <>
        …<mark>{r?.volunteer_name ?? 'the volunteer'}</mark> served as <mark>{r ? roleWords(r.role) : 'their role'}</mark>…
      </>
    ),
    why: 'Name from the account; role set at verify.',
  },
  {
    q: (
      <>
        …at <mark>{r?.event.title ?? 'the event'}</mark> on <mark>{r ? longDate(r.event.date) : 'the date'}</mark>…
      </>
    ),
    why: 'As created. Practice events never make a record.',
  },
  {
    q: (
      <>
        …for <mark>{r ? fmtHours(r.hours_total) : 'N'} hours</mark>, captured by check-in and check-out.
      </>
    ),
    why: 'Timed on the server from the volunteer’s scans.',
  },
  {
    q: <>The organization confirmed this when it closed the event.</>,
    why: 'Verifying closes the event and locks the rows.',
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
        lede="A stranger can see who vouches, when, and how the hours were captured."
        motif="leaf"
      >
        {href && <TextLink href={href}>Open a live verified record</TextLink>}
      </PageHero>

      <StepBar
        label="On this page"
        steps={[
          { id: 'evidence', label: 'Evidence' },
          { id: 'wording', label: 'Line by line' },
          { id: 'rules', label: 'The rules' },
          { id: 'minors', label: 'Minors and data' },
        ]}
      >
        <Section id="evidence" eyebrow="Where proof comes from" title="Evidence from the day, not a signature after the fact.">
          <EvidenceCompare />
        </Section>

        <Section id="wording" well eyebrow="The record" title="Line by line.">
          <div className={p.wordingGrid}>
            <Reveal className={p.wordingSticky}>
              <RecordPreview r={record} compact />
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

        <Section id="rules" eyebrow="The rules" title="Who attests, what can change, what can’t.">
          <TrustBento only={['attest', 'reason', 'locked', 'revoked', 'ai']} />
          <More summary="What AI does, and never does" className={p.afterMore}>
            <Facts
              items={[
                'Drafts rows from a photo of a paper sign-in sheet.',
                'Fills a new event form from a pasted message, link or flyer.',
                'Drafts a resume line, a broadcast or an event story from the facts.',
                'Never saves a row, invents a time, adds numbers, verifies hours or signs badges.',
              ]}
            />
          </More>
          <More summary="Who can read a record" className={p.afterMore}>
            <p>Anyone with the link, with no account. Search engines are asked not to index it. Nobody can edit it.</p>
          </More>
        </Section>

        <Section id="minors" well eyebrow="Minors and data" title="Collected only when needed, and kept small." action={<TextLink href="/privacy">Privacy policy</TextLink>}>
          <CardGrid cols={4}>
            <MiniCard icon="shield" title="Under 13">
              <p>Can’t join. Nothing stored.</p>
            </MiniCard>
            <MiniCard icon="share" title="Ages 13 to 17">
              <p>A guardian approves sharing.</p>
            </MiniCard>
            <MiniCard icon="message" title="Messages">
              <p>Announcements only for minors.</p>
            </MiniCard>
            <MiniCard icon="pin" title="Location">
              <p>Opt-in. No coordinates stored.</p>
            </MiniCard>
          </CardGrid>
          <More summary="The rules in full" className={p.afterMore}>
            <Facts
              items={[
                'Under 13 is refused at sign-up, at the door and online.',
                'Ages 13 to 17 confirm a parent or guardian knows when they join, and keep their hours.',
                'Minors get no event chats and no direct messages.',
                'Location is opt-in on both sides, keeps only when someone left, and verifying the event wipes it.',
              ]}
            />
          </More>
        </Section>
      </StepBar>

      <CtaBand text="Set-up takes about a minute. Volunteers never pay." />
    </>
  );
}
