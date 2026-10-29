import type { ReactNode } from 'react';
import { Icon, type IconName } from '../shell/icons';
import { Reveal } from './Reveal';
import { SpotlightGroup } from './Spotlight';
import s from './proof.module.css';

// The site's proof pieces, all plain facts about how the record is made.
// No customer logos, no quotes from people who don't exist, no made-up stats.

/* ── Evidence from the day vs a signature after the fact ──── */

const AFTER = ['Typed up later, from memory.', 'Signed days or weeks after.', 'Easy to forge, slow to check.'];
const DAY = ['Scanned in and out, timed on the server.', 'Confirmed by the organization that day.', 'A link that says VERIFIED or REVOKED.'];

export function EvidenceCompare() {
  return (
    <div className={s.compare}>
      <Reveal className={`${s.side} ${s.after}`}>
        <p className={s.sideLabel}>A signature after the fact</p>
        <ul>
          {AFTER.map((t) => (
            <li key={t}>
              <Icon name="x" size={16} />
              {t}
            </li>
          ))}
        </ul>
      </Reveal>
      <span className={s.arrow} aria-hidden="true">
        <Icon name="arrow-right" size={20} />
      </span>
      <Reveal className={`${s.side} ${s.day}`} delay={80}>
        <p className={s.sideLabel}>Evidence from the day</p>
        <ul>
          {DAY.map((t) => (
            <li key={t}>
              <Icon name="check" size={16} />
              {t}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

/* ── Trust bento (vengeance-ui features/eight, translated) ── */

function Card({ span, icon, title, children, art, wide }: { span: 2 | 3 | 6; icon?: IconName; title: string; children: ReactNode; art?: ReactNode; wide?: boolean }) {
  return (
    <article className={`${s.card} ${s.spot} ${s[`span${span}`]} ${wide ? s.wide : ''}`} data-spot="">
      {art && <div className={s.art}>{art}</div>}
      <div className={s.cardText}>
        {icon && (
          <span className={s.icon}>
            <Icon name={icon} size={20} />
          </span>
        )}
        <h3 className={s.cardTitle}>{title}</h3>
        <div className={s.cardBody}>{children}</div>
      </div>
    </article>
  );
}

function LockRing() {
  return (
    <span className={s.ring} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="10" rx="2.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}

export type TrustCard = 'attest' | 'reason' | 'locked' | 'revoked' | 'minors' | 'ai' | 'location';

/** The record's rules as a bento. `only` picks a subset (default: all seven). */
export function TrustBento({ only }: { only?: TrustCard[] } = {}) {
  const on = (k: TrustCard) => !only || only.includes(k);
  return (
    <SpotlightGroup className={s.bento}>
      {on('attest') && (
        <Card span={2} title="The organization attests, never the volunteer" art={<span className={s.ring} aria-hidden="true"><b>RR</b></span>}>
          <p>Volunteers can’t type or edit hours. The record names who to contact.</p>
        </Card>
      )}
      {on('reason') && (
        <Card
          span={2}
          title="Every changed hour needs a reason"
          art={
            <div className={s.adjust} aria-hidden="true">
              <span>
                <s>3</s> 2.5 <small>h</small>
              </span>
              <i>“Left at 11:30 for a work shift.”</i>
            </div>
          }
        >
          <p>Captured and adjusted hours sit side by side, reason printed.</p>
        </Card>
      )}
      {on('locked') && (
        <Card span={2} title="Locked once verified" art={<LockRing />}>
          <p>A database rule makes verified rows read-only. No switch turns it off.</p>
        </Card>
      )}
      {on('revoked') && (
        <Card
          span={3}
          wide
          title="Revocable, and the link says so"
          art={
            <div className={s.status} aria-hidden="true">
              <p className={s.ok}>
                <Icon name="check" size={16} /> <b>VERIFIED</b> · Riverside Restoration Crew
              </p>
              <p className={s.bad}>
                <Icon name="x" size={16} /> <b>REVOKED</b> · withdrawn by the organization
              </p>
            </div>
          }
        >
          <p>A withdrawn record shows REVOKED at the same link. Never edited in place.</p>
        </Card>
      )}
      {on('minors') && (
        <Card
          span={3}
          wide
          title="Built for minors"
          art={
            <ol className={s.ages} aria-hidden="true">
              <li>
                <b>Under 13</b> Can’t join. Nothing stored.
              </li>
              <li>
                <b>13 to 17</b> Sharing needs a guardian’s OK. Announcements only.
              </li>
              <li>
                <b>18+</b> Shares their own records.
              </li>
            </ol>
          }
        >
          <p>Enforced on the server, not just hidden in the interface.</p>
        </Card>
      )}
      {on('ai') && (
        <Card span={3} icon="clipboard" title="AI drafts, a person decides">
          <p>Claude drafts rows from a paper sheet. A coordinator confirms each one.</p>
        </Card>
      )}
      {on('location') && (
        <Card span={3} icon="pin" title="No location stored">
          <p>The leave-the-area check is off by default, and never keeps coordinates.</p>
        </Card>
      )}
    </SpotlightGroup>
  );
}

/* ── A statement band (vengeance-ui testimonials/five's layout). It quotes
      no one: it states what a published report asks for, and links to it. ── */

export function Statement({ children, cite }: { children: ReactNode; cite: ReactNode }) {
  return (
    <Reveal className={s.statement}>
      <span className={s.mark} aria-hidden="true">
        <Icon name="leaf" size={20} />
      </span>
      <p className={s.statementText}>{children}</p>
      <p className={s.cite}>{cite}</p>
    </Reveal>
  );
}
