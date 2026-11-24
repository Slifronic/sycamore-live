import { CtaBand, PageHero, Section, TextLink } from '@/components/site/Blocks';
import { pageMeta } from '@/components/site/meta';
import { publicImpact } from '@/lib/impact';
import { SMALL_GROUP } from '@/lib/impact-rules';
import s from './impact.module.css';

export const metadata = pageMeta(
  'Our impact',
  'How many people use SycaMore Live, the volunteer hours organizations have verified on it, and the skills volunteers are building.',
  '/our-impact',
);

// The public numbers: totals only, refreshed hourly. Every count under five
// says "fewer than 5" instead, and nothing here names a person, a tag, a
// listing or a day (lib/impact.ts, publicImpact). Verified hours and
// self-reported applications are kept apart, as on every other page.

const fmt = (n: number) => n.toLocaleString('en-US');
const few = `Fewer than ${SMALL_GROUP}`;
const show = (n: number | null) => (n === null ? few : fmt(n));

function Stat({ label, value, note }: { label: string; value: number | null; note: string }) {
  return (
    <div className={s.stat}>
      <span className={s.label}>{label}</span>
      <b className={value === null ? s.few : s.value}>{show(value)}</b>
      <span className={s.note}>{note}</span>
    </div>
  );
}

export default async function OurImpact() {
  const p = await publicImpact();
  const asOf = new Date(p.asOf).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <>
      <PageHero
        eyebrow="Our impact"
        title={['Real people,', <em key="e">real hours.</em>]}
        lede="What SycaMore Live has recorded so far. Verified hours come from the organizations; applications are what volunteers told us."
        motif="fern"
      >
        <TextLink href="/opportunities">Find a place to serve</TextLink>
      </PageHero>

      {p.unavailable && (
        <Section id="soon" label="Numbers coming soon">
          <p className={s.fine}>The numbers aren’t available right now. Check back soon.</p>
        </Section>
      )}

      <Section id="verified" eyebrow="Verified by organizations" title="Hours an organization confirmed." lede="Scanned in and out at the event, then confirmed by the organization that ran it.">
        <div className={s.grid}>
          <Stat label="Verified volunteer hours" value={p.verifiedHours} note="Confirmed when each event closed" />
          <Stat label="Volunteers with verified hours" value={p.verifiedPeople} note="At least one confirmed event" />
          <Stat label="Events verified" value={p.verifiedEvents} note="Each one closed by its organization" />
          <Stat label="Organizations" value={p.orgs} note="Running events on SycaMore Live" />
        </div>
        {p.verifiedSkills.length > 0 && (
          <div className={s.skills}>
            <h3>Skills practiced in verified hours</h3>
            <ul>
              {p.verifiedSkills.map((k) => (
                <li key={k.name}>
                  <span>{k.name}</span>
                  <span className={s.dim}>
                    {fmt(k.people)} people · {fmt(k.hours)} hours
                  </span>
                </li>
              ))}
            </ul>
            <p className={s.fine}>From the role and kind of event each organization confirmed. A skill area says what the time was spent doing, not how well.</p>
          </div>
        )}
      </Section>

      <Section id="reach" eyebrow="Reported by volunteers" title="Where SycaMore sends people." lede="Volunteer accounts, and roles at other organizations people told us they applied to from our listings." well>
        <div className={s.grid}>
          <Stat label="Volunteer accounts" value={p.volunteers} note="People who joined SycaMore Live" />
          <Stat label="Applied through SycaMore" value={p.applicants} note="Self-reported, from public listings" />
          <Stat label="Accepted" value={p.accepted} note="Self-reported; organizations don’t report back" />
          <Stat label="Public listings" value={p.listings} note="Checked by a person, linked to each organization" />
        </div>
        {p.appliedSkills.length > 0 && (
          <div className={s.skills}>
            <h3>Skills people applied to use</h3>
            <ul>
              {p.appliedSkills.map((k) => (
                <li key={k.skill}>
                  <span>{k.skill}</span>
                  <span className={s.dim}>{fmt(k.people)} people</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section id="method" eyebrow="How we count" title="Counted carefully, on purpose.">
        <ul className={s.method}>
          <li>Any number under {SMALL_GROUP} shows as “{few.toLowerCase()}”, so no one can be picked out.</li>
          <li>{p.demo ? 'This is a development copy, so the made-up demo accounts are counted here. The live site never counts them.' : 'Made-up demo accounts are never counted.'}</li>
          <li>Only organization-verified hours are called verified. Applications and acceptances are the volunteer’s own word.</li>
          <li>Totals refresh about once an hour. As of {asOf}.</li>
        </ul>
      </Section>

      <CtaBand
        title="Add your hours to the count."
        text="Join as a volunteer, or record your organization's events on SycaMore Live."
        primary={{ href: '/join', label: 'Join as a volunteer' }}
        secondary={{ href: '/org/start', label: 'Set up your organization' }}
      />
    </>
  );
}
