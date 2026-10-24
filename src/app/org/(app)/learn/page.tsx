import Link from 'next/link';
import { requireOrg } from '@/lib/session';
import { LESSONS, courseProgress } from '@/lib/course';
import { MarkDone } from './MarkDone';
import s from './learn.module.css';

export default async function LearnPage() {
  const org = await requireOrg();
  const flags = org.course;
  const p = courseProgress(flags);
  const minutes = LESSONS.reduce((n, l) => n + l.minutes, 0);

  return (
    <div className="stack" style={{ gap: 24, maxWidth: 860 }}>
      <header className={s.head}>
        <div>
          <p className={s.eyebrow}>Getting started course</p>
          <h1>SycaMore in {minutes} minutes</h1>
          <p className="muted">
            Six short lessons. Each one opens the real screen and finishes itself when you do the thing, so there’s nothing to memorize. Use the practice
            event; nothing you do there shows up in your reports.
          </p>
        </div>
        <div className={s.progress}>
          <span className={s.big}>
            {p.done}/{p.total}
          </span>
          <span className="small muted">{p.complete ? 'Done. You’re trained.' : `${minutes - LESSONS.filter((l) => flags[l.key]).reduce((n, l) => n + l.minutes, 0)} min left`}</span>
        </div>
      </header>

      <ol className={s.list}>
        {LESSONS.map((l, i) => {
          const done = !!flags[l.key];
          const isNext = p.next?.key === l.key;
          return (
            <li key={l.key} className={`card ${s.lesson} ${done ? s.done : ''} ${isNext ? s.next : ''}`}>
              <span className={s.num} aria-hidden>
                {done ? '✓' : i + 1}
              </span>
              <div className={s.body}>
                <div className="row between wrap">
                  <h2 className={s.title}>{l.title}</h2>
                  <span className="small muted">{l.minutes} min</span>
                </div>
                <p>{l.why}</p>
                {(isNext || !done) && (
                  <>
                    <ol className={s.steps}>
                      {l.steps.map((st) => (
                        <li key={st}>{st}</li>
                      ))}
                    </ol>
                    <p className="small muted">
                      <strong>Tip:</strong> {l.tip}
                    </p>
                  </>
                )}
                <div className="row wrap">
                  {done ? (
                    <span className="chip chip-green">Done</span>
                  ) : (
                    <>
                      <Link className={`btn ${isNext ? 'btn-primary' : ''}`} href={l.href}>
                        Try it
                      </Link>
                      <MarkDone lesson={l.key} />
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="card card-pad stack">
        <h2>Bringing on another coordinator?</h2>
        <p className="muted">
          Give them your PIN (<strong className="num">{org.coordinator_pin}</strong>). The same six lessons are here for them, and the practice event stays
          separate from your real numbers.
        </p>
      </section>
    </div>
  );
}

export const instant = false;
