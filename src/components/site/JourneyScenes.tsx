'use client';

import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react';
import { useId, useRef, type ComponentProps, type ReactNode } from 'react';
import { Icon } from '../shell/icons';
import { QrPattern } from './Drawings';
import { SEASON, type JourneyFacts } from './journey-data';
import s from './journey.module.css';

// The seven screens of the volunteer journey, drawn in HTML with the app's
// tokens. Each scene takes `l`, its own progress from 0 (arriving) through
// 0.5 (centred) to 1 (leaving). Everything it does happens between 0.2 and
// 0.55 and then holds, so l = 1 is the finished screen: that's what the
// server renders, what reduced motion keeps, and what print shows.
// Only transform and opacity ever move.

type SceneProps = { l: MotionValue<number>; f: JourneyFacts };

const useFade = (l: MotionValue<number>, a: number, b: number) => useTransform(l, [a, b], [0, 1]);
const useRise = (l: MotionValue<number>, a: number, b: number, from = '1.2em') => ({
  opacity: useTransform(l, [a, b], [0, 1]),
  y: useTransform(l, [a, b], [from, '0em']),
});

/* ── Frames ───────────────────────────────────────────────── */

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${s.phone} ${className ?? ''}`}>
      <span className={s.island} aria-hidden="true" />
      <div className={s.screen}>{children}</div>
    </div>
  );
}

export function WindowFrame({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={`${s.window} ${className ?? ''}`}>
      <div className={s.chrome} aria-hidden="true">
        <span className={s.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.url}>{url}</span>
      </div>
      <div className={s.winBody}>{children}</div>
    </div>
  );
}

/** A fingertip that travels to a button and presses it. */
function Tap({ l, at, className }: { l: MotionValue<number>; at: number; className: string }) {
  const opacity = useTransform(l, [at - 0.12, at - 0.06, at + 0.05, at + 0.1], [0, 1, 1, 0]);
  const x = useTransform(l, [at - 0.12, at - 0.02], ['3.5em', '0em']);
  const y = useTransform(l, [at - 0.12, at - 0.02], ['5em', '0em']);
  const scale = useTransform(l, [at - 0.02, at + 0.01, at + 0.05], [1, 0.72, 1]);
  return <motion.span className={`${s.tap} ${className}`} style={{ opacity, x, y, scale }} aria-hidden="true" />;
}

/** The verification seal: the moment a record becomes a record. */
export function Seal({ org, className, style }: { org: string; className?: string; style?: ComponentProps<typeof motion.svg>['style'] }) {
  const id = useId();
  return (
    <motion.svg viewBox="0 0 120 120" className={`${s.seal} ${className ?? ''}`} style={style} aria-hidden="true">
      <defs>
        <path id={id} d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
      </defs>
      <circle cx="60" cy="60" r="57" className={s.sealDisc} />
      <circle cx="60" cy="60" r="53" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text className={s.sealText}>
        <textPath href={`#${id}`} textLength="276" lengthAdjust="spacingAndGlyphs">
          {`VERIFIED · ${org.toUpperCase()} · ON THE RECORD · `}
        </textPath>
      </text>
      <path d="M45 61l10 10 20-22" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

/* ── 1 · Find an event ───────────────────────────────────── */

export function SceneFind({ l, f }: SceneProps) {
  const ring = useFade(l, 0.2, 0.3);
  const lift = useTransform(l, [0.2, 0.3], ['0em', '-0.35em']);
  const toast = useRise(l, 0.42, 0.5);
  const added = useFade(l, 0.4, 0.46);
  const notAdded = useTransform(added, (v) => 1 - v);
  return (
    <div className={s.app}>
      <div className={s.appBar}>
        <b>Discover</b>
        <span className={s.chipRow}>
          <span className={s.chipOn}>This week</span>
          <span className={s.chipOff}>Outdoors</span>
        </span>
      </div>
      <motion.div className={`${s.eventCard} ${s.eventMain}`} style={{ y: lift }}>
        <motion.span className={s.ring} style={{ opacity: ring }} />
        <div className={s.cover}>
          <Icon name="leaf" size={20} />
        </div>
        <p className={s.evTitle}>{f.event}</p>
        <p className={s.evMeta}>
          {f.day} · 9:00 AM – 12:00 PM
        </p>
        <p className={s.evMeta}>
          <Icon name="pin" size={16} /> {f.place}
        </p>
        <p className={s.evOrg}>{f.org}</p>
        <span className={s.evBtn}>
          <motion.span className={s.evBtnDone} style={{ opacity: added }}>
            <Icon name="check" size={16} /> Added
          </motion.span>
          <motion.span style={{ opacity: notAdded }}>Add to calendar</motion.span>
          <Tap l={l} at={0.38} className={s.tapEv} />
        </span>
      </motion.div>
      <div className={`${s.eventCard} ${s.eventDim}`}>
        <p className={s.evTitle}>Guadalupe River Cleanup</p>
        <p className={s.evMeta}>Sat, Sep 26 · 9:00 AM</p>
      </div>
      <motion.p className={s.toast} style={toast}>
        <Icon name="calendar" size={16} /> On your calendar
      </motion.p>
    </div>
  );
}

/* ── 2 · Scan in ─────────────────────────────────────────── */

export function SceneScan({ l, f }: SceneProps) {
  const frame = useTransform(l, [0.2, 0.34], [1.35, 1]);
  const scanY = useTransform(l, [0.24, 0.4], ['-4.6em', '4.6em']);
  const scanO = useTransform(l, [0.22, 0.25, 0.38, 0.41], [0, 1, 1, 0]);
  const flash = useTransform(l, [0.39, 0.41, 0.47], [0, 0.55, 0]);
  const sheetY = useTransform(l, [0.42, 0.52], ['105%', '0%']);
  return (
    <div className={s.camera}>
      <p className={s.camHint}>Point at the code</p>
      <div className={`${s.qrCard} force-light`}>
        <QrPattern className={s.qrSvg} />
        <p>Check in · {f.org}</p>
      </div>
      <motion.span className={s.brackets} style={{ scale: frame }} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </motion.span>
      <motion.span className={s.scanLine} style={{ y: scanY, opacity: scanO }} aria-hidden="true" />
      <motion.span className={s.flash} style={{ opacity: flash }} aria-hidden="true" />
      <motion.div className={s.sheet} style={{ y: sheetY }}>
        <span className={s.okDot}>
          <Icon name="check" size={20} />
        </span>
        <p className={s.sheetTitle}>You’re checked in</p>
        <p className={s.sheetSub}>{f.event}</p>
        <p className={s.sheetTime}>9:00 AM · {f.day}</p>
      </motion.div>
    </div>
  );
}

/* ── 3 · Work the shift ──────────────────────────────────── */

const clock = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = Math.floor(t % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
const END = 2 * 3600 + 59 * 60;

function Pip({ l, k }: { l: MotionValue<number>; k: number }) {
  const a = 0.2 + k * 0.14;
  const scaleX = useTransform(l, [a, a + 0.14], [0, 1]);
  return (
    <span className={s.pip}>
      <motion.i style={{ scaleX }} />
    </span>
  );
}

export function SceneShift({ l, f }: SceneProps) {
  const secs = useTransform(l, [0.2, 0.62], [0, END]);
  const out = useRef<HTMLSpanElement>(null);
  useMotionValueEvent(secs, 'change', (v) => {
    if (out.current) out.current.textContent = clock(v);
  });
  return (
    <div className={s.app}>
      <p className={s.liveTag}>
        <span className={s.liveDot} /> Checked in
      </p>
      <p className={s.shiftTitle}>{f.event}</p>
      <p className={s.timer}>
        <span ref={out} className="num">
          {clock(secs.get())}
        </span>
      </p>
      <p className={s.since}>Since 9:00 AM · timed from your scans</p>
      <div className={s.pips} aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <Pip key={k} l={l} k={k} />
        ))}
      </div>
      <div className={s.shiftNote}>
        <Icon name="pin" size={16} />
        <span>
          {f.place}
          <small>Planting crew, north meadow</small>
        </span>
      </div>
      <span className={s.bigBtn}>Check out</span>
    </div>
  );
}

/* ── 4 · Scan out ────────────────────────────────────────── */

export function SceneOut({ l, f }: SceneProps) {
  const pop = useTransform(l, [0.2, 0.3, 0.34], [0.4, 1.12, 1]);
  const popO = useFade(l, 0.2, 0.26);
  const times = useRise(l, 0.26, 0.36);
  const wait = useRise(l, 0.34, 0.46);
  return (
    <div className={`${s.app} ${s.center}`}>
      <motion.span className={s.bigCheck} style={{ scale: pop, opacity: popO }}>
        <Icon name="check" size={20} />
      </motion.span>
      <p className={s.outTitle}>Checked out</p>
      <motion.dl className={s.times} style={times}>
        <div>
          <dt>In</dt>
          <dd>9:00 AM</dd>
        </div>
        <div>
          <dt>Out</dt>
          <dd>12:00 PM</dd>
        </div>
      </motion.dl>
      <motion.div className={s.waitCard} style={wait}>
        <Icon name="hourglass" size={16} />
        <span>
          Waiting for {f.org} to confirm
          <small>No hours are shown until they do.</small>
        </span>
      </motion.div>
    </div>
  );
}

/* ── 5 · The coordinator verifies ────────────────────────── */

const VROWS = [
  { n: 'Maya Lin', h: '3', chip: 'green', label: 'From scans' },
  { n: 'Devon Ruiz', h: '3', chip: 'amber', label: 'Filled in', why: 'Didn’t scan out · counted to 12:00' },
  { n: 'Priya Shah', h: '2', was: '3', chip: 'ink', label: 'Changed', why: 'Left at 11 for a work shift' },
] as const;

function Lock({ l, k }: { l: MotionValue<number>; k: number }) {
  const a = 0.4 + k * 0.025;
  const opacity = useTransform(l, [a, a + 0.05], [0, 1]);
  const scale = useTransform(l, [a, a + 0.05], [0.4, 1]);
  return (
    <motion.span className={s.lock} style={{ opacity, scale }} aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <rect x="3" y="7" width="10" height="7" rx="1.6" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" />
      </svg>
    </motion.span>
  );
}

export function SceneVerify({ l, f }: SceneProps) {
  const done = useFade(l, 0.36, 0.42);
  const notDone = useTransform(done, (v) => 1 - v);
  const press = useTransform(l, [0.33, 0.35, 0.38], [1, 0.94, 1]);
  const banner = useRise(l, 0.42, 0.5, '-1em');
  const rows = [{ n: f.volunteer, h: f.hours, chip: 'green', label: 'From scans', me: true }, ...VROWS];
  return (
    <div className={s.verify}>
      <div className={s.vHead}>
        <div>
          <p className={s.vEyebrow}>Verify · {f.day}</p>
          <p className={s.vTitle}>{f.event}</p>
        </div>
        <span className={s.vStatus}>
          <motion.span className="chip chip-amber" style={{ opacity: notDone }}>
            Needs verification
          </motion.span>
          <motion.span className="chip chip-green" style={{ opacity: done }}>
            <Icon name="check" size={16} /> Verified
          </motion.span>
        </span>
      </div>
      <motion.p className={s.vBanner} style={banner}>
        <Icon name="check" size={16} /> Verified. These rows are now read-only.
      </motion.p>
      <ul className={s.vRows}>
        {rows.map((r, k) => (
          <li key={r.n} className={'me' in r ? s.vMe : undefined}>
            <span className={s.vAv}>
              {r.n
                .split(' ')
                .map((p) => p[0])
                .join('')}
            </span>
            <span className={s.vWho}>
              <b>{r.n}</b>
              {'why' in r && <i>{r.why}</i>}
            </span>
            <span className={s.vRole}>{'me' in r ? f.role : 'General'}</span>
            <span className={s.vHours}>
              {'was' in r && <s>{r.was}</s>}
              {r.h}
            </span>
            <span className={`chip chip-${r.chip} ${s.vChip}`}>{r.label}</span>
            <Lock l={l} k={k} />
          </li>
        ))}
        <li className={s.vMore}>and 41 more, pre-filled from their scans</li>
      </ul>
      <div className={s.vBar}>
        <span>
          <b>45</b> volunteers · <b>134</b> h
        </span>
        <motion.span className={s.vBtn} style={{ scale: press }}>
          <motion.span style={{ opacity: notDone }}>Verify &amp; close</motion.span>
          <motion.span className={s.vBtnDone} style={{ opacity: done }}>
            <Icon name="check" size={16} /> Closed
          </motion.span>
          <Tap l={l} at={0.34} className={s.tapV} />
        </motion.span>
      </div>
    </div>
  );
}

/* ── 6 · The public record ───────────────────────────────── */

export function SceneRecord({ l, f }: SceneProps) {
  const body = useRise(l, 0.18, 0.3);
  const sealScale = useTransform(l, [0.3, 0.38, 0.42], [2.1, 0.9, 1]);
  const sealRot = useTransform(l, [0.3, 0.42], [-38, -12]);
  const sealO = useTransform(l, [0.3, 0.34], [0, 1]);
  const banner = useFade(l, 0.36, 0.42);
  return (
    <div className={s.app}>
      <p className={s.addr}>
        <Icon name="shield" size={16} /> sycamore-live.vercel.app/v/{f.code}
      </p>
      <motion.p className={s.recBanner} style={{ opacity: banner }}>
        <strong>VERIFIED</strong> · issued by {f.org}
      </motion.p>
      <motion.div className={s.recBody} style={body}>
        <p className={s.recCode}>Service record {f.code}</p>
        <p className={s.recName}>{f.volunteer}</p>
        <p className={s.recHours}>
          {f.hours} <small>hours</small>
        </p>
        <dl className={s.recFacts}>
          <div>
            <dt>Role</dt>
            <dd>{f.role}</dd>
          </div>
          <div>
            <dt>Event</dt>
            <dd>{f.event}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{f.dateLong}</dd>
          </div>
        </dl>
        <p className={s.recWords}>
          <b>{f.org}</b> states that {f.first} served for {f.hours} hours, captured by check-in and check-out.
        </p>
        <p className={s.recContact}>
          <span>Questions about this record</span>
          {f.org} · {f.phone}
        </p>
      </motion.div>
      <Seal org={f.org} className={s.recSeal} style={{ scale: sealScale, rotate: sealRot, opacity: sealO }} />
    </div>
  );
}

/* ── 7 · On the application ──────────────────────────────── */

const ALL = [...SEASON.slice(0, 2), null, ...SEASON.slice(2)];

function Bar({ l, k, h, me }: { l: MotionValue<number>; k: number; h: number; me: boolean }) {
  const a = 0.18 + k * 0.035;
  const scaleY = useTransform(l, [a, a + 0.08], [0, 1]);
  return (
    <span className={`${s.bar} ${me ? s.barMe : ''}`} style={{ ['--h' as string]: h / 3.5 }}>
      <motion.i style={{ scaleY }} />
    </span>
  );
}

export function SceneApply({ l, f }: SceneProps) {
  const typed = useTransform(l, [0.22, 0.36], [1, 0]);
  const check = useRise(l, 0.4, 0.5);
  const total = SEASON.reduce((t, r) => t + Number(r.hours), 0) + Number(f.hours);
  return (
    <div className={s.apply}>
      <div className={s.aHead}>
        <p className={s.vEyebrow}>Scholarship application · Step 3 of 5</p>
        <p className={s.vTitle}>Community service</p>
      </div>
      <div className={s.aField}>
        <span className={s.aLabel}>Verification links</span>
        <span className={s.aInput}>
          <span className={s.aText}>
            sycamore-live.vercel.app/v/{f.code}
            <motion.span className={s.aMask} style={{ scaleX: typed }} />
          </span>
          <span className={s.aMoreLinks}>+5</span>
        </span>
      </div>
      <div className={s.season}>
        <div className={s.seasonHead}>
          <p>
            <b>{total}</b> verified hours · 6 records · 3 organizations
          </p>
          <span>Sep 6 – Oct 7</span>
        </div>
        <div className={s.bars} aria-hidden="true">
          {ALL.map((r, k) => (
            <Bar key={k} l={l} k={k} h={Number(r ? r.hours : f.hours)} me={!r} />
          ))}
        </div>
        <div className={s.barDays} aria-hidden="true">
          {ALL.map((r, k) => (
            <span key={k}>{r ? r.day : f.day.replace(/^\w+, /, '')}</span>
          ))}
        </div>
      </div>
      <motion.p className={s.aCheck} style={check}>
        <Icon name="check" size={16} /> Each link opens as VERIFIED, with no account
      </motion.p>
    </div>
  );
}

export const SCENES = [SceneFind, SceneScan, SceneShift, SceneOut, SceneVerify, SceneRecord, SceneApply];
export const WINDOW_URL: Record<number, string> = {
  4: 'sycamore-live.vercel.app/org/events/verify',
  6: 'apply.example.org/scholarship',
};
