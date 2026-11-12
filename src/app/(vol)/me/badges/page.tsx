import Link from 'next/link';
import { requireVolunteer } from '@/lib/vol-data';
import { attestedRows, toAttended, volunteerBadges, type VolBadge } from '@/lib/vol-badges';
import { computeMilestones, computeSkills, nextMilestones, reachedMilestones } from '@/lib/milestones';
import { MilestoneList, SkillList } from '@/components/milestones/Counted';
import { plural } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Stagger } from '@/components/motion/Stagger';
import { Icon } from '@/components/shell/icons';
import { Segmented } from '@/components/Segmented';
import { BadgeEmblem } from '@/components/vol/BadgeEmblem';
import { longDay, targetLine } from '@/components/vol/badge-format';
import { EmptyState } from '@/components/media/EmptyState';
import s from './badges.module.css';

export const metadata = {
  title: 'My badges',
  description: 'Badges organizations have signed for you, how close you are to the rest, and the milestones and skills counted from your verified hours.',
};

// The badge gallery. Signed means an organization signed a badge_award row;
// "in progress" and "ready" are computed from attested hours with the rules in
// badges.ts and are never a credential on their own.
//
// Under the badges: milestones and skills practiced (lib/milestones.ts). Those
// are arithmetic on the same attested rows, read once here for both. Nobody
// signs them, nothing is stored, and they have no share link.

const STATE_CHIP: Record<VolBadge['state'], [string, string]> = {
  signed: ['Signed', 'chip-green'],
  ready: ['Ready for sign-off', 'chip-green'],
  progress: ['In progress', 'chip-ink'],
  locked: ['Not started', 'chip-ink'],
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'signed', label: 'Signed' },
  { key: 'progress', label: 'In progress' },
  { key: 'locked', label: 'Not started' },
] as const;

function blurb(b: VolBadge) {
  const a = b.awards[0];
  if (b.state === 'signed' && a) return `Issued by ${a.org.name}. Signed by ${a.signed_by} on ${longDay(a.signed_at)}.`;
  if (b.state === 'ready' && b.best) return `You meet ${b.best.org.name}’s rule. It becomes a badge when ${b.best.org.coordinator_name} signs it.`;
  if (b.state === 'progress' && b.best) return `Counting the events ${b.best.org.name} has verified. ${b.def.rule}.`;
  return b.def.rule + '.';
}

export default async function BadgesPage({ searchParams }: PageProps<'/me/badges'>) {
  const vol = await requireVolunteer('/me/badges');
  const raw = (await searchParams).show;
  const show = FILTERS.some((f) => f.key === raw) ? (raw as (typeof FILTERS)[number]['key']) : 'all';
  const rowsRead = attestedRows(vol.id); // one read of the attested attendance, shared by badges, milestones and skills
  const [badges, rows] = await Promise.all([volunteerBadges(vol.id, rowsRead), rowsRead]);
  const attended = toAttended(rows);
  const milestones = computeMilestones(attended);
  const reached = reachedMilestones(milestones);
  const skills = computeSkills(attended);
  const signed = badges.filter((b) => b.state === 'signed').length;
  const inState = (b: VolBadge) => show === 'all' || (show === 'progress' ? b.state === 'progress' || b.state === 'ready' : b.state === show);
  const next = [...badges].filter((b) => b.state === 'ready' || b.state === 'progress').sort((a, b) => (b.best?.progress ?? 0) - (a.best?.progress ?? 0))[0];
  // The featured badge isn't repeated as the first tile under it.
  const featured = next && next.best ? next : null;
  const list = badges.filter((b) => inState(b) && b !== featured);
  const onlyFeatured = list.length === 0 && !!featured && inState(featured);

  return (
    <Stagger className={s.page}>
      <PageHeader
        eyebrow="Your work, recognized"
        title="My badges"
        lede="Signed by the organizations that saw the work."
        action={<span className={`chip ${signed ? 'chip-green' : 'chip-ink'}`}>{plural(signed, 'signed badge')}</span>}
      />

      {featured && next.best && (
        <Link href={`/me/badges/${next.def.key}`} className={`card lift ${s.feature}`}>
          <BadgeEmblem badge={next.def.key} state={next.state} size="lg" />
          <div className={s.featureBody}>
            <span className="eyebrow">{next.state === 'ready' ? 'Ready for sign-off' : 'Up next'}</span>
            <h2>{next.def.name}</h2>
            <p className="small muted">{blurb(next)}</p>
            <div className="bar bar-grow" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(next.best.progress * 100)} aria-label={`${next.def.name} progress`}>
              <span style={{ width: `${Math.round(next.best.progress * 100)}%` }} />
            </div>
            <span className="small muted">{targetLine(next)}</span>
          </div>
          <span className={s.arrow} aria-hidden>
            <Icon name="arrow-right" size={20} />
          </span>
        </Link>
      )}

      <Segmented id="badge-filter" label="Show badges" items={FILTERS.map((f) => ({ href: f.key === 'all' ? '/me/badges' : `/me/badges?show=${f.key}`, label: f.label, on: show === f.key }))} />

      {onlyFeatured ? null : list.length === 0 ? (
        <div className="card">
          <EmptyState
            illo="leaf-badge"
            title={show === 'signed' ? 'No signed badges yet.' : 'Nothing here right now.'}
            action={
              <Link className="btn" href="/me/badges">
                See all badges
              </Link>
            }
          >
            {show === 'signed'
              ? 'A badge is signed by the organization once your attested hours meet its rule. Take on a role at your next event to get started.'
              : 'Every badge you’ve started is under another filter.'}
          </EmptyState>
        </div>
      ) : (
        <div className={s.grid}>
          {list.map((b, i) => {
            const [label, chip] = STATE_CHIP[b.state];
            const pct = Math.round((b.best?.progress ?? 0) * 100);
            return (
              <Link key={b.def.key} href={`/me/badges/${b.def.key}`} className={`card lift fade-in ${s.tile}`} style={{ ['--d' as string]: `${i * 0.06}s` }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <BadgeEmblem badge={b.def.key} state={b.state} />
                  <span className={`chip ${chip}`}>
                    {b.state === 'signed' && <Icon name="check" size={14} />}
                    {label}
                  </span>
                </div>
                <h3 className={s.tileTitle}>{b.def.name}</h3>
                <p className="small muted">{blurb(b)}</p>
                {b.state !== 'signed' && (
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="bar bar-grow" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="small muted">{b.best ? targetLine(b) : 'No attested hours toward this yet'}</span>
                  </div>
                )}
                <span className={s.more}>{b.state === 'signed' ? 'Evidence, certificate and sharing' : 'See the rule'}</span>
              </Link>
            );
          })}
        </div>
      )}

      <p className="small muted">Progress moves only when an organization verifies an event. A badge counts once they sign it.</p>

      <section className={s.counted} id="milestones" aria-labelledby="milestones-title">
        <div className={s.countedHead}>
          <h2 id="milestones-title" className={s.h2}>
            Milestones
          </h2>
          <span className="chip chip-ink">Counted, not signed</span>
        </div>
        <p className="small muted">
          Counted from your verified hours each time you open this page. Nobody signs them and they have no share link. If an organization corrects your hours, these change with
          them.
        </p>
        <div className="card card-pad">
          <MilestoneList reached={reached} next={nextMilestones(milestones, 3, reached.length === 0)} empty="Every milestone is reached." />
        </div>
      </section>

      <section className={s.counted} id="skills" aria-labelledby="skills-title">
        <div className={s.countedHead}>
          <h2 id="skills-title" className={s.h2}>
            Skills practiced
          </h2>
          <span className="chip chip-ink">Counted, not signed</span>
        </div>
        <p className="small muted">
          What your verified hours were spent doing, from the role and the kind of event each organization confirmed. It is not a rating. Areas can overlap, so they don’t add up
          to a total.
        </p>
        <div className="card card-pad">
          <SkillList lines={skills} empty="Nothing yet. Your first verified event puts a line here, with the hours behind it." />
        </div>
      </section>

      <Link href="/badges" className={s.link}>
        How badges, milestones and skills are counted
      </Link>
    </Stagger>
  );
}

export const instant = false;
