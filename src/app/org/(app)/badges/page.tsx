import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { BADGES, badgeByKey } from '@/lib/badges';
import { SignBadgeForm } from './SignBadgeForm';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { HelpTip } from '@/components/media/HelpTip';
import s from './badges.module.css';

export const metadata = { title: 'Badges' };

export default async function BadgesPage() {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const earnedCount = (key: string) => ins.awards.filter((a) => a.badge === key).length;
  const ready = ins.badgeReady.length;

  return (
    <Stagger className="page">
      <PageHeader
        className={s.head}
        eyebrow="Recognition"
        title={
          <span className={s.titleRow}>
            Badges
            <HelpTip label="How badges work" more={{ href: '/org/learn', label: 'Lesson: sign off a badge' }}>
              <p>SycaMore finds who meets each badge’s rule in your verified hours and roles.</p>
              <p>A badge only counts once you sign it, with your note where the badge asks for one. It says which rule was met, never a skill.</p>
            </HelpTip>
          </span>
        }
        lede={ready ? `${ready} waiting for your signature.` : 'Nobody is waiting for your signature.'}
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
          <div className={s.readyGrid}>
            {ins.badgeReady.map(({ v, badge }) => {
              const def = badgeByKey[badge];
              return (
                <Card key={`${v.key}-${badge}`} className={s.ready}>
                  <div className={s.readyTop}>
                    <span className={s.medal} aria-hidden>
                      <Icon name="award" size={20} />
                    </span>
                    <div className={s.readyText}>
                      <h3>{v.name}</h3>
                      <p className={s.badgeName}>{def.name}</p>
                    </div>
                  </div>
                  <p className={s.facts}>
                    <span>
                      <span className="num">{v.events}</span> events · <span className="num">{v.hours}</span> hours
                    </span>
                    <span className={s.rule}>{def.rule}</span>
                  </p>
                  <SignBadgeForm volunteerId={v.volunteer_id!} badge={badge} badgeName={def.name} volunteerName={v.name} needsNote={def.needsNote} />
                </Card>
              );
            })}
          </div>
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
        <div className={s.catalog}>
          {BADGES.map((b) => {
            const n = earnedCount(b.key);
            return (
              <Card key={b.key} pad className={s.def}>
                <div className="row between" style={{ gap: 8 }}>
                  <h3>{b.name}</h3>
                  <Chip tone={n ? 'green' : 'ink'}>{n} signed</Chip>
                </div>
                <p className={s.defRule}>
                  {b.rule}
                  {b.needsNote ? `, plus your note: ${b.needsNote.toLowerCase()}` : ''}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </Stagger>
  );
}

export const instant = false;
