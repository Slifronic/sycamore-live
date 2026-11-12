import { Icon } from '@/components/shell/icons';
import { fmtHours } from '@/lib/hours';
import { milestoneLine, skillSentence, verifiedBy, type MilestoneState, type SkillLine } from '@/lib/milestones';
import s from './counted.module.css';

// Milestones and skills practiced, as flat lists. Deliberately plainer than a
// signed badge (no emblem, no certificate, no link): these are counts from
// verified hours, read fresh each time, and nobody signs them. Used on the
// volunteer's badges page and on the coordinator's hour-letter page. Server
// components, no JavaScript.

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' });

export function MilestoneList({ reached, next, empty }: { reached: MilestoneState[]; next: MilestoneState[]; empty: string }) {
  if (reached.length + next.length === 0) return <p className="small muted">{empty}</p>;
  return (
    <ul className={s.list}>
      {reached.map((m) => (
        <li key={m.key} className={s.item}>
          <span className={`${s.mark} ${s.markOn}`} aria-hidden>
            <Icon name="check" size={16} />
          </span>
          <span className={s.body}>
            <strong className={s.name}>{m.name}</strong>
            <span className={s.fact}>{m.fact}</span>
          </span>
          <span className={s.side}>{m.reached_at ? `Reached ${day(m.reached_at)}` : 'Reached'}</span>
        </li>
      ))}
      {next.map((m) => {
        const pct = Math.round(m.progress * 100);
        return (
          <li key={m.key} className={s.item}>
            <span className={s.mark} aria-hidden>
              <Icon name="trend-up" size={16} />
            </span>
            <span className={s.body}>
              <strong className={s.name}>{m.name}</strong>
              <span className={s.fact}>{m.fact}</span>
              <span className={`bar ${s.bar}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${m.name}: ${milestoneLine(m)}`}>
                <span style={{ width: `${pct}%` }} />
              </span>
            </span>
            <span className={s.side}>{milestoneLine(m)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** `byOrg`: name who verified the hours (the volunteer's own page). A coordinator's view is one organization already. */
export function SkillList({ lines, byOrg = true, empty }: { lines: SkillLine[]; byOrg?: boolean; empty: string }) {
  if (lines.length === 0) return <p className="small muted">{empty}</p>;
  return (
    <ul className={s.list}>
      {lines.map((l) => (
        <li key={l.key} className={s.item}>
          <span className={s.mark} aria-hidden>
            <Icon name="leaf" size={16} />
          </span>
          <span className={s.body}>
            <strong className={s.name}>{l.name}</strong>
            <span className={s.fact}>
              {skillSentence(l)}
              {byOrg ? `, ${verifiedBy(l.orgs)}` : ''}.
            </span>
          </span>
          <span className={s.side}>
            {fmtHours(l.hours)} h · {l.events} {l.events === 1 ? 'event' : 'events'}
          </span>
        </li>
      ))}
    </ul>
  );
}
