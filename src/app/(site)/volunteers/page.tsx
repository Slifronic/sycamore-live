import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, Illo, PageHero, SectionHead, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { CardGrid, FeatureRow, Facts, MiniCard } from '@/components/site/Feature';
import { Phone, Photo } from '@/components/site/Frames';
import { RecordPreview } from '@/components/site/RecordPreview';
import { featuredRecord } from '@/components/site/featured-record';
import { photo } from '@/components/site/media';
import p from '../pages.module.css';

export const metadata: Metadata = {
  title: 'For volunteers',
  description:
    'Check in with your phone, keep every confirmed hour in one place, share a record anyone can check, find events on Discover and earn badges signed by a coordinator. Always free for volunteers.',
};

export default async function Volunteers() {
  const record = await featuredRecord();
  return (
    <>
      <PageHero
        eyebrow="For volunteers"
        title={['Your hours,', 'confirmed, and', <em key="e">yours to share.</em>]}
        lede="Scan in when you arrive, scan out when you leave. The organization confirms your hours, and you get a record that a school or scholarship committee can check on its own. Always free."
        art={
          <div className={p.heroPhoto}>
            <Photo src={photo('audience-volunteer')} alt="A volunteer checking in with a phone at an outdoor event" sizes="(min-width: 960px) 520px, 92vw" ratio="4 / 5" priority />
            <div className={p.heroBadge}>
              <RecordPreview r={record} compact />
            </div>
          </div>
        }
      >
        <div className={ss.ctas}>
          <Link href="/join" className="btn btn-primary btn-big">
            Join in one step
          </Link>
          <Link href="/discover" className="btn btn-big">
            Find an event
          </Link>
        </div>
      </PageHero>

      <section className={p.block} aria-labelledby="vol-steps">
        <div className={ss.wrap}>
          <SectionHead eyebrow="At the event" title="Three taps, no typing." id="vol-steps" />
          <CardGrid cols={3}>
            <MiniCard icon={<Illo name="compass" size={64} />} title="1 · Scan the code">
              <p>At the sign-in table, scan the event’s QR code. New? Join with your name, email and birth date, and you’re back on the check-in.</p>
            </MiniCard>
            <MiniCard icon={<Illo name="sapling" size={64} />} title="2 · Serve">
              <p>Your phone shows a running timer. Nothing to remember, nothing to write down.</p>
            </MiniCard>
            <MiniCard icon={<Illo name="leaf-badge" size={64} />} title="3 · Check out">
              <p>Tap Check out when you leave. Forget? The coordinator fills it in, and the reason is printed on your record.</p>
            </MiniCard>
          </CardGrid>
        </div>
      </section>

      <div className={p.tint}>
        <div className={ss.wrap}>
          <FeatureRow id="my-hours" eyebrow="My hours" title="Every confirmed hour, in one place." art={<div className={p.phonePair}><Phone name="me-phone" /></div>}>
            <p>
              My hours adds up your attested hours, events and organizations, and lets you set a private goal. An event the organization hasn’t
              confirmed yet shows as waiting, with no number: nothing is official until it’s verified.
            </p>
            <Facts items={['Your journey: every event with role, hours and a running total.', 'Print any record or save it as a PDF.']} />
          </FeatureRow>

          <FeatureRow
            id="share"
            eyebrow="Share link"
            title="A link a scholarship committee can check without calling anyone."
            flip
            art={<RecordPreview r={record} />}
          >
            <p>
              Each record has a share link and QR code. Whoever opens it sees VERIFIED (or REVOKED), the organization’s statement, how the hours
              were captured and adjusted, and who to call with questions. No account needed.
            </p>
            <p>
              <TextLink href={record?.code ? `/v/${record.code}` : '/trust'}>Open a verified record</TextLink>
            </p>
          </FeatureRow>

          <FeatureRow
            id="discover"
            eyebrow="Discover"
            title="Find your next event, your way."
            art={
              <div className={p.covers}>
                {(['cover-shelter', 'cover-tutoring', 'cover-planting', 'cover-food'] as const).map((c) => (
                  <Photo key={c} src={photo(c, true)} alt="" sizes="(min-width: 960px) 280px, 45vw" ratio="1" />
                ))}
              </div>
            }
          >
            <p>
              Upcoming public events from every organization, ranked in your browser by what you want: use your experience, learn something
              new, or follow your interests.
            </p>
            <Facts items={['Rule-based fit, shown with its range. Not a probability.', 'Pasted resume text never leaves the page.', 'Save events for later, then just show up and check in.']} />
          </FeatureRow>

          <FeatureRow
            id="badges"
            eyebrow="Badges"
            title="Signed by a coordinator, not handed out by an algorithm."
            flip
            art={
              <div className={p.illoPanel}>
                <Illo name="leaf-badge" size={150} />
                <div className={p.illoNote}>
                  <p className={p.noteTitle}>What a badge says</p>
                  <p>Its name, the rule it’s for, who signed it and when, and the coordinator’s note. No skill claims. Adults can add it to LinkedIn with a facts-only post.</p>
                </div>
              </div>
            }
          >
            <p>
              The system finds who meets a badge’s rule from attested attendance. A coordinator signs each one. Pending check-ins and practice
              events never count.
            </p>
          </FeatureRow>
        </div>
      </div>

      <section className={p.block} aria-labelledby="vol-minors">
        <div className={ss.wrap}>
          <SectionHead eyebrow="Privacy" title="Extra care for volunteers under 18." id="vol-minors" lede="These rules live in the data layer, not just the screens." split />
          <CardGrid cols={4}>
            <MiniCard title="Under 13">
              <p>Can’t join. The sign-up refuses and stores nothing.</p>
            </MiniCard>
            <MiniCard title="Sharing">
              <p>Ages 13 to 17 keep their hours, but sharing a record needs a guardian’s OK.</p>
            </MiniCard>
            <MiniCard title="Messages">
              <p>Under 18 gets announcements only: no event group chats, no direct messages.</p>
            </MiniCard>
            <MiniCard title="Location">
              <p>The leave-early check is off unless you turn it on, and no coordinates are stored.</p>
            </MiniCard>
          </CardGrid>
        </div>
      </section>

      <CtaBand
        title="Got an event coming up? Join in one step."
        text="Name, email and birth date. Then scan the code at the sign-in table, and your hours start counting."
        primary={{ href: '/join', label: 'Join as a volunteer' }}
        secondary={{ href: '/discover', label: 'Discover events' }}
        note="Volunteers never pay."
      />
    </>
  );
}
