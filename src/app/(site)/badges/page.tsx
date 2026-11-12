import { CtaBand, Facts, PageHero, Section, TextLink } from '@/components/site/Blocks';
import { More, Pairs } from '@/components/site/Chips';
import { CardGrid } from '@/components/site/Feature';
import { pageMeta } from '@/components/site/meta';
import { StepBar } from '@/components/site/StepBar';
import { Icon } from '@/components/shell/icons';
import { BadgeEmblem } from '@/components/vol/BadgeEmblem';
import { BADGES } from '@/lib/badges';
import {
  ACTIVITIES, ACTIVITY_MILESTONE, HOUR_MILESTONES, MILESTONES, MONTH_MILESTONES, ORG_MILESTONE, SKILL_AREAS, skillSentence, skillSource, verifiedBy,
} from '@/lib/milestones';
import { ACTIVITY_LABEL } from '@/lib/types';
import p from '../pages.module.css';
import s from './badges.module.css';

export const metadata = pageMeta(
  'Badges, milestones and skills',
  'The four badges a coordinator signs and their exact rules, every milestone counted from verified hours, the skill areas, and what none of them claim.',
  '/badges',
);

// The library. Every rule and number on this page is read from the same
// definitions the app counts with (lib/badges.ts, lib/milestones.ts), so the
// page can't drift from what a volunteer or coordinator sees.

const list = (ns: number[]) => `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;

// The wording of a skills line, built by the same functions the app uses. The
// numbers and the organization are an example, labelled as one.
const EXAMPLE = `${skillSentence({ sources: [{ kind: 'role', key: 'team_lead', label: 'as team lead', hours: 12, events: 4 }] })}, ${verifiedBy(['Riverside Restoration Crew'])}.`;

const SAYS = ['Which rule the verified record met.', 'Which organization signed it, who, and when.', 'What the coordinator saw, where the badge asks for a note.'];
const SAYS_NOT = [
  'How well anyone did the work.',
  'That a skill is certified, or at what level.',
  'How a volunteer compares with anyone else. No scores, tiers or percentages.',
  'What job, course or employer it fits.',
  'Anything SycaMore Live checked itself. The organization makes the claim.',
];

export default function BadgesLibrary() {
  return (
    <>
      <PageHero
        eyebrow="The library"
        title={['Badges, milestones', <em key="e">and skills practiced.</em>]}
        lede="A coordinator signs a badge. Milestones and skills are counted from verified hours."
        motif="leaf"
      >
        <TextLink href="/trust">What a record says</TextLink>
      </PageHero>

      <StepBar
        label="On this page"
        steps={[
          { id: 'signed', label: 'Signed badges' },
          { id: 'milestones', label: 'Milestones' },
          { id: 'skills', label: 'Skills practiced' },
          { id: 'limits', label: 'The limits' },
        ]}
      >
        <Section id="signed" eyebrow="Signed badges" title={`${BADGES.length} badges, each signed by a coordinator.`} lede="The app finds who meets a rule. A coordinator signs it.">
          <CardGrid cols={2}>
            {BADGES.map((b) => (
              <article key={b.key} className={s.badge} data-spot="">
                <div className={s.badgeHead}>
                  <BadgeEmblem badge={b.key} state="signed" />
                  <h3 className={s.badgeName}>{b.name}</h3>
                </div>
                <p className={s.rule}>{b.rule}.</p>
                <ul className={s.targets}>
                  {b.targets.map((t) => (
                    <li key={t.label}>
                      <b>
                        {t.need} {t.unit}
                      </b>
                      <span>{t.label}</span>
                    </li>
                  ))}
                </ul>
                <p className={s.note}>{b.needsNote ? `Signed with a note. The coordinator is asked for: “${b.needsNote}”.` : 'No note asked for.'}</p>
              </article>
            ))}
          </CardGrid>
          <div className={s.after}>
            <Pairs
              items={[
                { icon: 'users', label: 'Who signs', text: 'The organization’s coordinator, by name, with the date.' },
                { icon: 'clipboard', label: 'What counts', text: 'Verified hours at that organization. Practice events and unconfirmed check-ins never do.' },
                { icon: 'shield', label: 'Check it', text: 'A shared badge opens at a public link, /v/b/BDG-XXXX-XXXX, with the rule, signer and note.' },
              ]}
            />
          </div>
        </Section>

        <Section id="milestones" well eyebrow="Milestones" title="Counted from verified hours. Never signed." lede="Not stored, no link of their own. Correct an hour and they move with it.">
          <Pairs
            items={[
              { icon: 'clock', label: 'Verified hours', text: `Reached at ${list(HOUR_MILESTONES)} verified hours.` },
              { icon: 'calendar', label: 'Months of service', text: `Reached at ${list(MONTH_MILESTONES)} different calendar months with verified service.` },
              { icon: 'users', label: 'Organizations', text: `Verified hours at ${ORG_MILESTONE} or more organizations.` },
              {
                icon: 'leaf',
                label: 'Kinds of service',
                text: `${ACTIVITY_MILESTONE.events} or more verified events and ${ACTIVITY_MILESTONE.hours} or more verified hours of one kind. ${ACTIVITIES.length} kinds.`,
              },
            ]}
          />
          <More summary={`All ${MILESTONES.length} milestones, one by one`} className={p.afterMore}>
            <dl className={s.all}>
              {MILESTONES.map((m) => (
                <div key={m.key}>
                  <dt>{m.name}</dt>
                  <dd>{m.fact}</dd>
                </div>
              ))}
            </dl>
          </More>
          <More summary="What counts toward a milestone" className={s.moreNext}>
            <Facts
              items={[
                'Only events an organization verified. Practice events, unconfirmed check-ins and revoked records never count.',
                'The hours are the record’s own: as scanned, or as the coordinator adjusted them with a reason.',
                'A volunteer sees every organization counted together. A coordinator sees their own organization’s hours only.',
                'The transcript has its own named hour milestones, which also count hours a supervisor confirmed by email.',
              ]}
            />
          </More>
        </Section>

        <Section id="skills" eyebrow="Skills practiced" title="What the hours were spent doing." lede="Practiced, with the hours behind it. Never a rating.">
          <Pairs items={SKILL_AREAS.map((a) => ({ label: a.name, text: `${skillSource(a)}.` }))} />
          <p className={s.example}>
            <span>A line reads</span>“{EXAMPLE}” <em>Example numbers.</em>
          </p>
          <More summary="Where a line comes from" className={p.afterMore}>
            <Facts
              items={[
                'The role is the one the coordinator set when verifying the event.',
                `The kind of event is the one the organization gave it: ${ACTIVITIES.map((a) => ACTIVITY_LABEL[a].toLowerCase()).join(', ')}.`,
                'One event can sit under several areas, so the areas don’t add up to a total.',
                'Not signed and not shareable on its own.',
              ]}
            />
          </More>
        </Section>

        <Section id="limits" well eyebrow="The limits" title="What a badge does not say.">
          <div className={p.compare}>
            <div className={p.compareCard}>
              <h3 className={s.sideLabel}>A signed badge says</h3>
              <ul>
                {SAYS.map((t) => (
                  <li key={t}>
                    <Icon name="check" size={18} className={p.yes} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className={p.compareCard}>
              <h3 className={s.sideLabel}>It does not say</h3>
              <ul>
                {SAYS_NOT.map((t) => (
                  <li key={t}>
                    <Icon name="x" size={18} className={p.no} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className={s.limit}>Milestones and skills practiced say less still: a count, and what the hours were spent on. Nobody signs them.</p>
        </Section>
      </StepBar>

      <CtaBand text="Set-up takes about a minute. Volunteers never pay." />
    </>
  );
}
