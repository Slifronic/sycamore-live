import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { LESSONS, COURSE_MINUTES, courseProgress } from '@/lib/course';
import { MarkDone } from './MarkDone';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/shell/icons';
import { CountUp } from '@/components/motion/CountUp';
import { Stagger } from '@/components/motion/Stagger';
import { PinReveal } from '@/components/PinReveal';
import s from './learn.module.css';

export const metadata = {
  title: 'Learn',
  description: 'A 7-minute course. Each lesson opens the real screen and completes itself when you do the action.',
};

export default async function LearnPage() {
  const org = await requireOrg('/org/learn');
  const flags = org.course;
  const p = courseProgress(flags);
  const pct = Math.round((100 * p.done) / p.total);

  return (
    <Stagger className={`page ${s.page}`}>
      <PageHeader
        eyebrow="Getting started"
        title={`SycaMore in ${COURSE_MINUTES} minutes`}
        lede="Six short lessons. Each opens the real screen and ticks itself off when you do the thing."
        action={
          p.next ? (
            <Link className="btn btn-primary" href={p.next.href}>
              {p.done === 0 ? 'Start the first lesson' : 'Next lesson'} <Icon name="arrow-right" size={16} />
            </Link>
          ) : undefined
        }
      />

      <Card pad className={s.progressCard}>
        <div className={s.progressNum}>
          <span className="figure">
            <CountUp value={p.done} />
            <span className="figure-unit">of {p.total} done</span>
          </span>
          <span className={s.progressSub}>{p.complete ? 'You’re trained. Revisit any lesson below.' : `${p.minutesLeft} min left`}</span>
        </div>
        <div className={s.fat} role="progressbar" aria-label="Lessons done" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
          <span style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
        <p className={s.practice}>
          <Icon name="shield" size={16} />
          Use the practice event to try things. Nothing you do there shows up in your reports.
        </p>
      </Card>

      <ol className={s.list} aria-label="Lessons">
        {LESSONS.map((l, i) => {
          const done = !!flags[l.key];
          const isNext = p.next?.key === l.key;
          return (
            <li key={l.key} className={`card ${s.lesson}`} data-state={done ? 'done' : isNext ? 'next' : 'todo'}>
              <span className={s.num} aria-hidden>
                {done ? <Icon name="check" size={16} strokeWidth={2.25} /> : i + 1}
              </span>
              <div className={s.body}>
                <div className={s.titleRow}>
                  <h2 className={s.title}>{l.title}</h2>
                  {done ? (
                    <Chip tone="green" icon="check">
                      Done
                    </Chip>
                  ) : (
                    <span className={s.mins}>
                      <Icon name="clock" size={14} /> {l.minutes} min
                    </span>
                  )}
                </div>
                {!done && <p className={s.why}>{l.why}</p>}
                {isNext && (
                  <div className={s.detail}>
                    <ol className={s.steps}>
                      {l.steps.map((st) => (
                        <li key={st}>{st}</li>
                      ))}
                    </ol>
                    <p className={s.tip}>
                      <strong>Tip</strong> {l.tip}
                    </p>
                  </div>
                )}
                {!done && !isNext && (
                  <details className={s.more}>
                    <summary>
                      Steps <Icon name="chevron-down" size={14} />
                    </summary>
                    <ol className={s.steps}>
                      {l.steps.map((st) => (
                        <li key={st}>{st}</li>
                      ))}
                    </ol>
                    <p className={s.tip}>
                      <strong>Tip</strong> {l.tip}
                    </p>
                  </details>
                )}
                <div className={s.actions}>
                  {done ? (
                    <Link className="btn btn-quiet btn-sm" href={l.href}>
                      Open again
                    </Link>
                  ) : (
                    <>
                      <Link className={`btn btn-sm ${isNext ? 'btn-primary' : ''}`} href={l.href}>
                        Try it
                      </Link>
                      <MarkDone lesson={l.key} title={l.title} />
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Card pad className={s.team}>
        <span className={s.teamIcon} aria-hidden>
          <Icon name="users" size={20} />
        </span>
        <div className={s.teamText}>
          <h2>Bringing on another coordinator?</h2>
          <p>
            Add them in <Link href="/org/settings">Account and team</Link>: they sign in with Google. The same lessons are here for them, and the
            practice event stays out of your numbers.
          </p>
        </div>
        {org.pin_enabled && <PinReveal pin={org.coordinator_pin} />}
      </Card>
    </Stagger>
  );
}

export const instant = false;
