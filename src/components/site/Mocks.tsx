import s from './mocks.module.css';

// Small HTML drawings of real screens, in the app's own wording, for places
// where a screenshot would be too small to read. Names are made up.

const ROWS = [
  { name: 'Maya Lin', scans: '9:02 – 12:04', hours: '3', chip: { tone: 'green', text: 'From scans' } },
  {
    name: 'Devon Ruiz',
    scans: '9:10 – no scan out',
    hours: '2.8',
    chip: { tone: 'amber', text: 'Filled in' },
    reason: 'Didn’t scan out; counted until 12:00 PM when the event closed',
  },
  {
    name: 'Priya Shah',
    scans: '9:00 – 12:01',
    hours: '2',
    was: '3',
    chip: { tone: 'ink', text: 'Changed' },
    reason: 'Left at 11 for a work shift; confirmed with her by phone',
  },
  { name: 'Sam Torres', scans: '9:31 – 12:00', hours: '2.5', chip: { tone: 'green', text: 'From scans' }, walkin: true },
] as const;

export function VerifyMock({ className }: { className?: string }) {
  return (
    <div className={`${s.verify} ${className ?? ''}`} role="img" aria-label="Drawing of the verify screen: four volunteers, hours pre-filled from their scans, one filled in and one changed, each with its reason printed">
      <div className={s.vHead}>
        <div>
          <p className={s.vEyebrow}>Verify · Creek Planting, Phase 2</p>
          <p className={s.vTitle}>Did everyone’s hours come out right?</p>
        </div>
        <span className={s.vDemo}>Made-up names</span>
      </div>
      <ul className={s.vRows}>
        {ROWS.map((r) => (
          <li key={r.name} className={s.vRow} data-tone={r.chip.tone}>
            <div className={s.vWho}>
              <span className={s.vAvatar}>{r.name.split(' ').map((p) => p[0]).join('')}</span>
              <div>
                <p className={s.vName}>
                  {r.name}
                  {'walkin' in r && <span className={s.vNew}>Signed up at the door</span>}
                </p>
                <p className={s.vScans}>{r.scans}</p>
              </div>
            </div>
            <div className={s.vHours}>
              {'was' in r && <s className={s.vWas}>{r.was}</s>}
              <span className={s.vNum}>{r.hours}</span>
              <span className={`chip chip-${r.chip.tone}`}>{r.chip.text}</span>
            </div>
            {'reason' in r && <p className={s.vReason}>“{r.reason}”</p>}
          </li>
        ))}
      </ul>
      <div className={s.vBar}>
        <span>
          <b>4 volunteers</b> · 10.3 hours
        </span>
        <span className={s.vBtn}>Verify &amp; close</span>
      </div>
    </div>
  );
}

export function QrCard({ className }: { className?: string }) {
  // A decorative QR-like pattern (not a scannable code), seeded so it never changes.
  const cells: boolean[] = [];
  let x = 7;
  for (let i = 0; i < 21 * 21; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    cells.push(x % 100 < 46);
  }
  const finder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    return inBox(0, 0) || inBox(0, 14) || inBox(14, 0);
  };
  return (
    <div className={`${s.qr} ${className ?? ''}`} aria-hidden="true">
      <p className={s.qrEyebrow}>Scan to check in</p>
      <svg viewBox="0 0 21 21" className={s.qrSvg} shapeRendering="crispEdges">
        {cells.map((on, i) => {
          const r = Math.floor(i / 21);
          const c = i % 21;
          if (finder(r, c)) return null;
          return on ? <rect key={i} x={c} y={r} width={1} height={1} /> : null;
        })}
        {[
          [0, 0],
          [0, 14],
          [14, 0],
        ].map(([r, c]) => (
          <g key={`${r}-${c}`}>
            <rect x={c + 0.5} y={r + 0.5} width={6} height={6} fill="none" stroke="currentColor" strokeWidth={1} />
            <rect x={c + 2} y={r + 2} width={3} height={3} />
          </g>
        ))}
      </svg>
      <p className={s.qrCode}>
        or type <b>K7Q2MP</b>
      </p>
    </div>
  );
}

export function RosterMock({ className }: { className?: string }) {
  const people = [
    ['Maya Lin', '9:02 AM', 'in'],
    ['Devon Ruiz', '9:10 AM', 'in'],
    ['Priya Shah', '9:00 AM', 'in'],
    ['Sam Torres', '9:31 AM', 'new'],
    ['Lee Park', '9:04 AM', 'out'],
  ] as const;
  return (
    <div className={`${s.roster} ${className ?? ''}`} aria-hidden="true">
      <div className={s.rHead}>
        <span className={s.liveDot} /> Live roster
        <b className={s.rCount}>4 here</b>
      </div>
      <ul>
        {people.map(([n, t, st]) => (
          <li key={n} data-st={st}>
            <span>{n}</span>
            <span className={s.rTime}>{st === 'out' ? 'Checked out 11:58' : `In ${t}`}</span>
            {st === 'new' && <span className={s.rNew}>New</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
