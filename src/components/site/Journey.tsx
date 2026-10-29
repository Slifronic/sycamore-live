'use client';

import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '../shell/icons';
import { JOURNEY, type JourneyFacts } from './journey-data';
import { PhoneFrame, SCENES, Seal, WINDOW_URL, WindowFrame } from './JourneyScenes';
import s from './journey.module.css';

// One volunteer, start to finish. On a wide screen with motion allowed, the
// section pins a stage and scroll scrubs through seven screens while the
// record assembles itself line by line beside them (useScroll/useTransform;
// native scroll, nothing is hijacked). Everywhere else (phones, reduced
// motion, no JavaScript, print) it is an ordinary list of seven steps, each
// with its finished screen, and that is also what the server renders.

const N = JOURNEY.length;
const PIN = 'screen and (min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)';
const MOTION = 'screen and (prefers-reduced-motion: no-preference)';

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 1 while within 0.3 of `i`, crossfading to 0 by 0.7. */
const vis = (pos: number, i: number) => clamp01(1 - (Math.abs(pos - i) - 0.3) / 0.4);
function piecewise(x: number, xs: number[], ys: number[]) {
  if (x <= xs[0]) return ys[0];
  for (let k = 1; k < xs.length; k++) {
    if (x <= xs[k]) return ys[k - 1] + ((x - xs[k - 1]) / (xs[k] - xs[k - 1])) * (ys[k] - ys[k - 1]);
  }
  return ys[ys.length - 1];
}

const PHONE_STEPS = JOURNEY.map((st, i) => (st.device === 'phone' ? i : -1)).filter((i) => i >= 0);
const WINDOW_STEPS = JOURNEY.map((st, i) => (st.device === 'window' ? i : -1)).filter((i) => i >= 0);

/** The device shows its next screen while hidden, so it never comes back blank. */
function slotPos(pos: number, steps: number[]) {
  const xs: number[] = [];
  const ys: number[] = [];
  steps.forEach((st, k) => {
    xs.push(st - 0.3, st + 0.3);
    ys.push(k, k);
  });
  return piecewise(pos, xs, ys);
}
const windowWeight = (pos: number) => clamp01(1 - (Math.min(...WINDOW_STEPS.map((w) => Math.abs(pos - w))) - 0.3) / 0.4);

export function Journey({ facts, skipTo }: { facts: JourneyFacts; skipTo: { href: string; label: string } }) {
  const pinned = useMedia(PIN);
  return pinned ? <Pinned f={facts} skipTo={skipTo} /> : <JourneyFlow facts={facts} className={s.flowWrap} compact />;
}

/* ── Pinned stage ─────────────────────────────────────────── */

function Pinned({ f, skipTo }: { f: JourneyFacts; skipTo: { href: string; label: string } }) {
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const pos = useTransform(scrollYProgress, (p) => p * (N - 1 + 0.6) - 0.3);
  const [active, setActive] = useState(0);
  useMotionValueEvent(pos, 'change', (v) => {
    const a = Math.min(N - 1, Math.max(0, Math.round(v)));
    setActive((prev) => (prev === a ? prev : a));
  });

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.3) / (N - 1 + 0.6)) * span + 1, behavior: 'smooth' });
  };

  const phoneW = useTransform(pos, (p) => 1 - windowWeight(p));
  const windowW = useTransform(pos, windowWeight);
  const phoneX = useTransform(phoneW, (w) => `${(1 - w) * -3}em`);
  const phoneS = useTransform(phoneW, (w) => 0.94 + 0.06 * w);
  const winY = useTransform(windowW, (w) => `${(1 - w) * 3}em`);
  const winS = useTransform(windowW, (w) => 0.95 + 0.05 * w);
  const phoneSlot = useTransform(pos, (p) => slotPos(p, PHONE_STEPS));
  const winSlot = useTransform(pos, (p) => slotPos(p, WINDOW_STEPS));

  return (
    <div ref={track} className={s.track} style={{ ['--n' as string]: N }}>
      <div className={s.stage}>
        <div className={s.left}>
          <div className={s.progress}>
            <p className={s.counter} aria-live="polite">
              <span className="sr-only">Step </span>
              <span className={s.counterNum}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={active}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  >
                    {String(active + 1).padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className={s.counterOf}> of {String(N).padStart(2, '0')}</span>
              <span className="sr-only">: {JOURNEY[active].title}</span>
            </p>
            <ol className={s.segs}>
              {JOURNEY.map((st, i) => (
                <Segment key={st.id} i={i} pos={pos} label={st.short} on={i === active} onGo={() => go(i)} />
              ))}
            </ol>
          </div>

          <div className={s.copyStack}>
            {JOURNEY.map((st, i) => (
              <StepCopy key={st.id} i={i} pos={pos} f={f} />
            ))}
          </div>

          <Ledger pos={pos} f={f} />
          <a className={s.skip} href={skipTo.href}>
            {skipTo.label} <Icon name="arrow-right" size={16} />
          </a>
        </div>

        <div className={s.device} aria-hidden="true">
          <motion.div className={s.devPhone} style={{ opacity: phoneW, x: phoneX, scale: phoneS }}>
            <PhoneFrame>
              {PHONE_STEPS.map((stepIdx, k) => (
                <Screen key={stepIdx} stepIdx={stepIdx} slot={k} slotPos={phoneSlot} pos={pos} f={f} />
              ))}
            </PhoneFrame>
          </motion.div>
          <motion.div className={s.devWindow} style={{ opacity: windowW, y: winY, scale: winS }}>
            <WindowFrame url={WINDOW_URL[active === 6 || active === 5 ? 6 : 4]}>
              {WINDOW_STEPS.map((stepIdx, k) => (
                <Screen key={stepIdx} stepIdx={stepIdx} slot={k} slotPos={winSlot} pos={pos} f={f} />
              ))}
            </WindowFrame>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Segment({ i, pos, label, on, onGo }: { i: number; pos: MotionValue<number>; label: string; on: boolean; onGo: () => void }) {
  const fill = useTransform(pos, (p) => clamp01(p - i + 0.5));
  return (
    <li>
      <button type="button" className={s.seg} aria-current={on ? 'step' : undefined} onClick={onGo}>
        <span className={s.segTrack}>
          <motion.i style={{ scaleX: fill }} />
        </span>
        <span className={s.segLabel}>{label}</span>
      </button>
    </li>
  );
}

function StepCopy({ i, pos, f }: { i: number; pos: MotionValue<number>; f: JourneyFacts }) {
  const st = JOURNEY[i];
  // A sequential swap, not a crossfade: the outgoing label is gone by the
  // midpoint, so two big labels never overlap.
  const opacity = useTransform(pos, (p) => clamp01(1 - (Math.abs(p - i) - 0.3) / 0.2));
  const y = useTransform(pos, (p) => `${Math.max(-1, Math.min(1, (i - p) / 0.5)) * 2.4}rem`);
  return (
    <motion.div className={s.copy} style={{ opacity, y }}>
      <h3 className={s.copyTitle}>{st.short}</h3>
      <p className={s.copyText}>{st.caption(f)}</p>
    </motion.div>
  );
}

function Screen({ stepIdx, slot, slotPos: sp, pos, f }: { stepIdx: number; slot: number; slotPos: MotionValue<number>; pos: MotionValue<number>; f: JourneyFacts }) {
  const opacity = useTransform(sp, (p) => vis(p, slot));
  // Centred (pos = step) is l = 0.6, so each screen has finished its moment by then.
  const l = useTransform(pos, (p) => clamp01((p - stepIdx + 0.5) * 1.2));
  const Scene = SCENES[stepIdx];
  return (
    <motion.div className={s.layer} style={{ opacity }}>
      <Scene l={l} f={f} />
    </motion.div>
  );
}

/* The record, assembling itself as the steps pass. Decorative: the steps' own
   text says all of it. */
function Row({ pos, at, label, value, wait }: { pos: MotionValue<number>; at: number; label: string; value: string; wait?: { at: number; text: string } }) {
  const on = useTransform(pos, (p) => clamp01((p - at + 0.15) / 0.2));
  const y = useTransform(on, (v) => `${(1 - v) * 0.5}em`);
  const pre = useTransform(pos, (p) => clamp01((p - (wait?.at ?? 99) + 0.15) / 0.2) * (1 - clamp01((p - at + 0.3) / 0.12)));
  const dash = useTransform([on, pre] as MotionValue<number>[], ([a, b]: number[]) => 1 - Math.max(a, b));
  return (
    <div className={s.lRow}>
      <dt>{label}</dt>
      <dd>
        <motion.span className={s.lDash} style={{ opacity: dash }}>
          —
        </motion.span>
        {wait && (
          <motion.span className={s.lWait} style={{ opacity: pre }}>
            <Icon name="hourglass" size={16} /> {wait.text}
          </motion.span>
        )}
        <motion.span className={s.lVal} style={{ opacity: on, y }}>
          {value}
        </motion.span>
      </dd>
    </div>
  );
}

function Ledger({ pos, f }: { pos: MotionValue<number>; f: JourneyFacts }) {
  const sealO = useTransform(pos, (p) => clamp01((p - 4.9) / 0.2));
  const sealS = useTransform(sealO, (v) => 1.6 - 0.6 * v);
  const sealR = useTransform(sealO, (v) => -30 + 18 * v);
  return (
    <div className={s.ledger} aria-hidden="true">
      <p className={s.lHead}>
        <span>Record</span>
        <span className={s.lCode}>{f.code}</span>
      </p>
      <dl className={s.lRows}>
        <Row pos={pos} at={0} label="Event" value={f.day} />
        <Row pos={pos} at={1} label="In" value="9:00 AM" />
        <Row pos={pos} at={3} label="Out" value="12:00 PM" />
        <Row pos={pos} at={4} label="Hours" value={`${f.hours} · locked`} wait={{ at: 3, text: 'Waiting' }} />
        <Row pos={pos} at={5} label="Link" value={`/v/${f.code}`} />
        <Row pos={pos} at={6} label="Used for" value="Scholarship" />
      </dl>
      <Seal org={f.org} className={s.lSeal} style={{ opacity: sealO, scale: sealS, rotate: sealR }} />
    </div>
  );
}

/* ── Flow: the same seven steps as a list ─────────────────── */

/** `compact` shows each step as its label and one-line caption (the home page). */
export function JourneyFlow({ facts, ids, className, compact }: { facts: JourneyFacts; ids?: boolean; className?: string; compact?: boolean }) {
  const live = useMedia(MOTION);
  return (
    <ol className={`${s.flow} ${compact ? s.flowCompact : ''} ${className ?? ''}`}>
      {JOURNEY.map((st, i) => (
        <FlowStep key={st.id} i={i} f={facts} live={live} id={ids ? `step-${st.id}` : undefined} compact={compact} />
      ))}
    </ol>
  );
}

function FlowStep({ i, f, live, id, compact }: { i: number; f: JourneyFacts; live: boolean; id?: string; compact?: boolean }) {
  const st = JOURNEY[i];
  const ref = useRef<HTMLLIElement>(null);
  const l = useMotionValue(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'start 0.3'] });
  // Forward only: a screen keeps the furthest state it reached, so scrolling
  // back up never empties it again.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (live) l.set(Math.max(l.get(), 0.15 + 0.45 * v));
  });
  // Follow the media query: reduced motion (or no match yet) holds the finished screen.
  useEffect(() => {
    l.set(live ? 0.15 + 0.45 * scrollYProgress.get() : 1);
  }, [live, l, scrollYProgress]);
  const Scene = SCENES[i];
  return (
    <li ref={ref} className={`${s.flowStep} ${i % 2 ? s.flowFlip : ''}`} id={id}>
      <div className={s.flowText}>
        {compact ? (
          <>
            <p className={s.flowNum}>
              <span>{String(i + 1).padStart(2, '0')}</span>
            </p>
            <h3 className={s.copyTitle}>{st.short}</h3>
            <p className={s.copyText}>{st.caption(f)}</p>
          </>
        ) : (
          <>
            <p className={s.flowNum}>
              <span>{String(i + 1).padStart(2, '0')}</span> {st.short}
            </p>
            <h3 className={s.copyTitle}>{st.title}</h3>
            <p className={s.copyText}>{st.text(f)}</p>
            {st.note && <p className={s.copyNote}>{st.note(f)}</p>}
          </>
        )}
      </div>
      <div className={s.flowArt} aria-hidden="true">
        {st.device === 'phone' ? (
          <PhoneFrame className={s.flowPhone}>
            <div className={s.layer}>
              <Scene l={l} f={f} />
            </div>
          </PhoneFrame>
        ) : (
          <WindowFrame url={WINDOW_URL[i]} className={s.flowWindow}>
            <div className={s.layer}>
              <Scene l={l} f={f} />
            </div>
          </WindowFrame>
        )}
      </div>
    </li>
  );
}
