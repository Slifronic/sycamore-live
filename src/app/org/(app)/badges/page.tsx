import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { BADGES, badgeByKey } from '@/lib/badges';
import { SignAllForm, SignBadgeForm } from './SignBadgeForm';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { HelpTip } from '@/components/media/HelpTip';
import s from './badges.module.css';

export const metadata = {
  title: 'Badges',
  description: 'Sign badges for volunteers who met a rule in your verified events, and see who is almost there.',
};

export default async function BadgesPage() {
  const org = await requireOrg('/org/badges');
  const ins = await loadOrgInsights(org.id);
  const earnedCount = (key: string) => ins.awards.filter((a) => a.badge === key).length;
  const ready = ins.badgeReady.length;
  // "Sign all" covers the badges whose rule needs no note; the rest need the coordinator's words.
  const quick = ins.badgeReady.filter((r) => !badgeByKey[r.badge].needsNote).length;

  return (
    <Stagger className="page">
      <PageHeader
        className={s.head}
        eyebrow="Recognition"
        title="Badges"
        lede={ready ? `${ready} waiting for your signature.` : 'Nobody is waiting for your signature.'}
        help={
          <HelpTip label="How badges work" placement="bottom-end" more={{ href: '/org/learn', label: 'Lesson: sign off a badge' }}>
            <p>SycaMore finds who meets each badge’s rule in your verified hours and roles.</p>
            <p>A badge only counts once you sign it, with your note where the badge asks for one. It says which rule was met, never a skill.</p>
          </HelpTip>
        }
        action={quick >= 2 ? <SignAllForm count={quick} /> : undefined}
      />

      <section className="stack" aria-labelledby="ready-h">
        <h2 id="ready-h" className={s.h2}>
          Ready for your sign-off {ready > 0 && <Chip tone="amber">{ready}</Chip>}
        </h2>
        {ready === 0 ? (
          <Card>
            <EmptyState icon="award" title="Nobody is waiting" hint="When someone meets a badge’s rule in your verified events, they show up here." compact />
          </Card>
        ) : (
          <Card>
            <ul className={s.readyList}>
              {ins.badgeReady.map(({ v, badge }) => {
                const def = badgeByKey[badge];
                return (
                  <li key={`${v.key}-${badge}`} className={s.readyRow}>
                    <span className={s.medal} aria-hidden>
                      <Icon name="award" size={16} />
                    </span>
                    <span className={s.who}>
                      <strong>{v.name}</strong>
                      <span className={s.badgeName}>{def.name}</span>
                    </span>
                    <span className={s.evidence}>
                      <span className={s.evidenceFacts}>
                        <span className="num">{v.events}</span> events · <span className="num">{v.hours}</span> hours
                      </span>
                      <span className={s.rule}>{def.rule}</span>
                    </span>
                    <SignBadgeForm volunteerId={v.volunteer_id!} badge={badge} badgeName={def.name} volunteerName={v.name} needsNote={def.needsNote} />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {ins.badgeClose.length > 0 && (
        <Card as="section" aria-labelledby="close-h">
          <CardHeader id="close-h" title="Almost there" action={<span className={s.cardHint}>A good reason to invite someone back</span>} className={s.cardHead} />
          <ul className={s.close}>
            {ins.badgeClose.slice(0, 8).map((c) => {
              const pct = Math.round(c.progress * 100);
              return (
                <li key={`${c.v.key}-${c.key}`}>
                  <strong className={s.closeName}>{c.v.name}</strong>
                  <span className={s.closeBadge}>{badgeByKey[c.key].name}</span>
                  <span className={s.closeBar} role="img" aria-label={`${pct}% of the way`}>
                    <span className="bar">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className={`num ${s.closePct}`}>{pct}%</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <section className="stack" aria-labelledby="all-h">
        <h2 id="all-h" className={s.h2}>
          The badges
        </h2>
        <Card>
          <ul className={s.readyList}>
            {BADGES.map((b) => {
              const n = earnedCount(b.key);
              return (
                <li key={b.key} className={s.defRow}>
                  <span className={s.defIcon} aria-hidden>
                    <Icon name="award" size={16} />
                  </span>
                  <span className={s.defText}>
                    <strong>{b.name}</strong>
                    <span className={s.defRule}>
                      {b.rule}
                      {b.needsNote ? `, plus your note: ${b.needsNote.toLowerCase()}` : ''}
                    </span>
                  </span>
                  <Chip tone={n ? 'green' : 'ink'} className={s.defCount}>
                    <span className="num">{n}</span> signed
                  </Chip>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </Stagger>
  );
}

export const instant = false;
