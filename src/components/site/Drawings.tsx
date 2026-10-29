import { Icon } from '../shell/icons';
import { LiveTimer } from './LiveTimer';
import s from './drawings.module.css';

// Small drawings of real screens for the "How it works" steps and the split
// value cards, in the app's own wording and tokens. Names are made up.

/** A QR-like pattern (not a scannable code), seeded so it never changes. */
export function QrPattern({ className }: { className?: string } = {}) {
  const cells: boolean[] = [];
  let x = 7;
  for (let i = 0; i < 17 * 17; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    cells.push(x % 100 < 46);
  }
  const finder = (r: number, c: number) => {
    const box = (r0: number, c0: number) => r >= r0 && r < r0 + 5 && c >= c0 && c < c0 + 5;
    return box(0, 0) || box(0, 12) || box(12, 0);
  };
  return (
    <svg viewBox="0 0 17 17" className={className ?? s.qr} shapeRendering="crispEdges" aria-hidden="true">
      {cells.map((on, i) => {
        const r = Math.floor(i / 17);
        const c = i % 17;
        if (finder(r, c) || !on) return null;
        return <rect key={i} x={c} y={r} width={1} height={1} />;
      })}
      {[
        [0, 0],
        [0, 12],
        [12, 0],
      ].map(([r, c]) => (
        <g key={`${r}-${c}`}>
          <rect x={c + 0.5} y={r + 0.5} width={4} height={4} fill="none" stroke="currentColor" strokeWidth={1} />
          <rect x={c + 1.75} y={r + 1.75} width={1.5} height={1.5} />
        </g>
      ))}
    </svg>
  );
}

export function CheckInMock() {
  return (
    <div className={s.frame} data-frame="" aria-hidden="true">
      <div className={s.checkin}>
        <div className={s.qrTile}>
          <QrPattern />
          <p className={s.code}>
            or type <b>PLANT2</b>
          </p>
        </div>
        <div className={s.session}>
          <p className={s.eyebrow}>
            <span className={s.dot} /> Checked in
          </p>
          <p className={s.timer}>
            <LiveTimer startOffset={42 * 60 + 18} />
          </p>
          <span className={s.btn}>Check out</span>
        </div>
      </div>
    </div>
  );
}

const ROWS = [
  { name: 'Maya Lin', hours: '3', chip: 'green', label: 'From scans' },
  { name: 'Devon Ruiz', hours: '2.8', chip: 'amber', label: 'Filled in' },
  { name: 'Priya Shah', hours: '2', was: '3', chip: 'ink', label: 'Changed', reason: 'Left at 11 for a work shift' },
] as const;

export function VerifyMock() {
  return (
    <div className={s.frame} data-frame="" aria-hidden="true">
      <ul className={s.rows}>
        {ROWS.map((r) => (
          <li key={r.name} className={s.row}>
            <span className={s.avatar}>{r.name.split(' ').map((p) => p[0]).join('')}</span>
            <span className={s.who}>
              <b>{r.name}</b>
              {'reason' in r && <i>“{r.reason}”</i>}
            </span>
            <span className={s.hours}>
              {'was' in r && <s>{r.was}</s>}
              {r.hours}
            </span>
            <span className={`chip chip-${r.chip} ${s.chip}`}>{r.label}</span>
          </li>
        ))}
      </ul>
      <div className={s.bar}>
        <span>
          <b>58</b> volunteers · 171 h
        </span>
        <span className={s.btn}>Verify &amp; close</span>
      </div>
    </div>
  );
}

export function ShareMock() {
  return (
    <div className={s.frame} data-frame="" aria-hidden="true">
      <div className={s.record}>
        <p className={s.verified}>
          <Icon name="check" size={16} /> Verified · Riverside Restoration Crew
        </p>
        <div className={s.recordId}>
          <div>
            <p className={s.recCode}>SYC-RVR7-PLNT</p>
            <p className={s.recName}>Ana Reyes</p>
            <p className={s.recEvent}>Team lead · Santa Teresa Planting</p>
          </div>
          <p className={s.recHours}>
            3<small>hours</small>
          </p>
        </div>
        <div className={s.shareRow}>
          <span className={s.ghost}>
            <Icon name="copy" size={16} /> Copy link
          </span>
          <span className={s.ghost}>
            <Icon name="share" size={16} /> Share
          </span>
        </div>
      </div>
    </div>
  );
}

/** Coordinator split card: what's waiting, the way the home page says it. */
export function NeedsYouMock() {
  return (
    <div className={s.mini} aria-hidden="true">
      <span className="chip chip-amber">Needs verification</span>
      <p className={s.miniTitle}>Santa Teresa Planting, Phase 2</p>
      <p className={s.miniSub}>Ended yesterday · 4 didn’t scan out</p>
      <span className={s.btn}>Verify</span>
    </div>
  );
}

/** Volunteer split card: confirmed hours and what's still waiting. */
export function MyHoursMock() {
  return (
    <div className={s.mini} aria-hidden="true">
      <p className={s.eyebrow}>Your verified hours</p>
      <p className={s.bigNum}>
        42<small>+6 this month</small>
      </p>
      <p className={s.waiting}>
        <Icon name="hourglass" size={16} /> Waiting for Riverside Restoration Crew to confirm
      </p>
    </div>
  );
}

/** New event from a pasted message: the fields it filled, one marked unsure. */
export function PasteMock() {
  return (
    <div className={s.frame} data-frame="" aria-hidden="true">
      <div className={s.paste}>
        <p className={s.pasted}>“Creek planting this Sat 9–12 at Guadalupe Oak Grove, bring gloves + water!”</p>
        <dl className={s.fields}>
          <div>
            <dt>Title</dt>
            <dd className={s.filled}>Creek Planting</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd className={s.filled}>Sat, Oct 31 · 9:00 AM – 12:00 PM</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd className={s.unsure}>Guadalupe Oak Grove Park?</dd>
          </div>
          <div>
            <dt>Bring</dt>
            <dd className={s.filled}>Gloves and water</dd>
          </div>
        </dl>
        <span className={s.btn}>Create event</span>
      </div>
    </div>
  );
}

/** The live roster with a walk-in who signed up at the door. */
export function RosterMock() {
  const people: [string, string, boolean?][] = [
    ['Jonah Patel', 'In 8:54 AM'],
    ['Grace Reyes', 'In 8:56 AM'],
    ['Sam Torres', 'In 9:31 AM', true],
    ['Mina Rossi', 'In 9:40 AM'],
  ];
  return (
    <div className={s.frame} data-frame="" aria-hidden="true">
      <div className={s.roster}>
        <p className={s.rosterHead}>
          <span className={s.eyebrow}>
            <span className={s.dot} /> Live roster
          </span>
          <b>4 here</b>
        </p>
        <ul>
          {people.map(([n, t, walk]) => (
            <li key={n}>
              <span className={s.rosterName}>
                {n}
                {walk && <span className="chip chip-green">Signed up at the door</span>}
              </span>
              <span className={s.rosterTime}>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Verify's pre-flight: who didn't scan out, and the flags, each one tap. */
export function FillInMock() {
  return (
    <div className={s.frame} data-frame="" aria-hidden="true">
      <div className={s.fill}>
        <p className={s.eyebrow}>Before you verify</p>
        <div className={s.fillRow}>
          <Icon name="hourglass" size={16} />
          <span>
            <b>4 didn’t scan out</b>
            <small>Counted to the end, 12:00 PM. The reason prints on their record.</small>
          </span>
          <span className={s.btn}>Fill in 4</span>
        </div>
        <div className={s.fillRow}>
          <Icon name="alert" size={16} />
          <span>
            <b>1 shift over 8 hours</b>
            <small>Flagged for a second look.</small>
          </span>
          <span className={`chip chip-amber ${s.chip}`}>Check</span>
        </div>
        <div className={s.bar}>
          <span>
            <b>58</b> volunteers · 171 h
          </span>
          <span className={s.btn}>Verify &amp; close</span>
        </div>
      </div>
    </div>
  );
}

/** The funder report: observed facts, no score. Demo numbers. */
export function FunderMock() {
  const cells: [string, string][] = [
    ['435', 'verified hours'],
    ['105', 'unique volunteers'],
    ['3', 'events verified'],
    ['$18,161', 'value of volunteer time'],
  ];
  return (
    <div className={s.frame} data-frame="" aria-hidden="true">
      <div className={s.report}>
        <p className={s.reportHead}>
          <span>Funder report · Fall 2026</span>
          <span className={s.reportActions}>
            <span className={s.ghost}>PDF</span>
            <span className={s.ghost}>CSV</span>
          </span>
        </p>
        <dl className={s.reportGrid}>
          {cells.map(([v, k]) => (
            <div key={k}>
              <dd>{v}</dd>
              <dt>{k}</dt>
            </div>
          ))}
        </dl>
        <p className={s.reportNote}>At Independent Sector’s 2025 preliminary California rate, $41.75 an hour.</p>
      </div>
    </div>
  );
}
