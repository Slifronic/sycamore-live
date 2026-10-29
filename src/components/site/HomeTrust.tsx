import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '../shell/icons';
import { SpotlightGroup } from './Spotlight';
import { SEASON, type JourneyFacts } from './journey-data';
import p from './proof.module.css';
import s from './HomeTrust.module.css';

// The home page's trust bento: Proof's TrustBento layout and drawings, with
// each card cut to a title and one line. Trust (/trust) owns the long version.

function Card({ span, icon, title, children, art, wide }: { span: 2 | 3; icon?: IconName; title: string; children: ReactNode; art?: ReactNode; wide?: boolean }) {
  return (
    <article className={`${p.card} ${p.spot} ${p[`span${span}`]} ${wide ? p.wide : ''}`} data-spot="">
      {art && <div className={p.art}>{art}</div>}
      <div className={p.cardText}>
        {icon && (
          <span className={p.icon}>
            <Icon name={icon} size={20} />
          </span>
        )}
        <h3 className={p.cardTitle}>{title}</h3>
        <div className={p.cardBody}>{children}</div>
      </div>
    </article>
  );
}

function LockRing() {
  return (
    <span className={p.ring} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="10" rx="2.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}

/** Ana's demo season: her featured record plus SEASON, one bar per dated shift. */
function SeasonBars({ f }: { f: JourneyFacts }) {
  const own = { title: f.event, day: f.day.replace(/^\w+, /, ''), hours: f.hours, me: true };
  const rows = [...SEASON.map((r) => ({ ...r, me: false })), own].sort((a, b) => Date.parse(`${a.day} 2026`) - Date.parse(`${b.day} 2026`));
  const max = Math.max(...rows.map((r) => Number(r.hours) || 0), 1);
  return (
    <div className={s.season} aria-hidden="true">
      <div className={s.bars}>
        {rows.map((r) => (
          <span key={r.title + r.day} className={r.me ? s.me : undefined} style={{ ['--h' as string]: (Number(r.hours) || 0) / max }}>
            <i />
          </span>
        ))}
      </div>
      <div className={s.days}>
        {rows.map((r) => (
          <span key={r.title + r.day}>{r.day}</span>
        ))}
      </div>
    </div>
  );
}

export function HomeTrust({ f }: { f: JourneyFacts }) {
  return (
    <SpotlightGroup className={p.bento}>
      <Card span={2} title="The organization attests" art={<span className={p.ring} aria-hidden="true"><b>RR</b></span>}>
        <p>Never the volunteer. Volunteers can’t type or edit hours.</p>
      </Card>
      <Card
        span={2}
        title="Every changed hour needs a reason"
        art={
          <div className={p.adjust} aria-hidden="true">
            <span>
              <s>3</s> 2.5 <small>h</small>
            </span>
            <i>“Left at 11:30 for a work shift.”</i>
          </div>
        }
      >
        <p>Captured and adjusted hours print side by side.</p>
      </Card>
      <Card span={2} title="Locked once verified" art={<LockRing />}>
        <p>A database rule makes verified rows read-only.</p>
      </Card>
      <Card
        span={3}
        wide
        title="Revocable, and the link says so"
        art={
          <div className={p.status} aria-hidden="true">
            <p className={p.ok}>
              <Icon name="check" size={16} /> <b>VERIFIED</b> · active
            </p>
            <p className={p.bad}>
              <Icon name="x" size={16} /> <b>REVOKED</b> · withdrawn
            </p>
          </div>
        }
      >
        <p>Withdrawn records show REVOKED. Never edited in place.</p>
      </Card>
      <Card
        span={3}
        wide
        title="Built for minors"
        art={
          <ul className={s.chips}>
            <li>Under 13 can’t join</li>
            <li>Guardian approves sharing</li>
            <li>Announcements only, no DMs</li>
          </ul>
        }
      >
        <p>
          Enforced on the server. <Link href="/trust#minors">Under-18 rules</Link>
        </p>
      </Card>
      <Card span={2} icon="clipboard" title="AI drafts, a person decides">
        <p>Claude reads paper sheets. A coordinator confirms every row.</p>
      </Card>
      <Card span={2} icon="pin" title="No location stored">
        <p>The leave-the-area check is opt-in, and never keeps coordinates.</p>
      </Card>
      <Card span={2} title="Months, not one total" art={<SeasonBars f={f} />}>
        <p>
          Each shift is its own dated record, as{' '}
          <a href="https://mcc.gse.harvard.edu/reports/turning-the-tide-college-admissions" rel="noopener noreferrer" target="_blank">
            Turning the Tide
          </a>{' '}
          asks.
        </p>
      </Card>
    </SpotlightGroup>
  );
}
