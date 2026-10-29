'use client';

import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { FillInMock, FunderMock, PasteMock, RosterMock } from './Drawings';
import { Reveal } from './Reveal';
import s from './path.module.css';

// The coordinator's side of the same morning, in four steps. A rule joins
// them and draws itself as the section scrolls past (scaleX on wide screens,
// scaleY when the steps stack). Before the script runs, under reduced motion
// and in print, the rule is simply drawn: it's decoration, never content.

const STEPS = [
  {
    when: 'Before',
    title: 'Set up',
    text: 'Paste an invite. The event form fills itself.',
    art: <PasteMock />,
  },
  {
    when: 'Event day',
    title: 'Run the day',
    text: 'One QR code. The roster fills itself.',
    art: <RosterMock />,
  },
  {
    when: 'After',
    title: 'Verify',
    text: 'Hours arrive pre-filled. Every change needs a reason.',
    art: <FillInMock />,
  },
  {
    when: 'Reporting',
    title: 'Report',
    text: 'Hour letters and a funder report, PDF or CSV.',
    art: <FunderMock />,
  },
];

const MOTION = 'screen and (prefers-reduced-motion: no-preference)';
function useMotionOK() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(MOTION);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(MOTION).matches,
    () => false,
  );
}

function Node({ p, i, n }: { p: MotionValue<number>; i: number; n: number }) {
  const at = i / (n - 1);
  const scale = useTransform(p, [at - 0.06, at + 0.02], [0, 1]);
  return (
    <span className={s.node} aria-hidden="true">
      <motion.i style={{ scale }} />
    </span>
  );
}

export function CoordinatorPath() {
  const list = useRef<HTMLOListElement>(null);
  const live = useMotionOK();
  const p = useMotionValue(1);
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 0.8', 'end 0.65'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (live) p.set(Math.max(p.get(), v));
  });
  useEffect(() => {
    p.set(live ? scrollYProgress.get() : 1);
  }, [live, p, scrollYProgress]);

  return (
    <ol ref={list} className={s.path}>
      <motion.span className={s.rail} aria-hidden="true" style={{ ['--p' as string]: p }}>
        <i />
      </motion.span>
      {STEPS.map((st, i) => (
        <li key={st.title} className={s.step}>
          <Node p={p} i={i} n={STEPS.length} />
          <Reveal className={s.card} delay={i * 70}>
            <p className={s.when}>
              <span>{String(i + 1).padStart(2, '0')}</span> {st.when}
            </p>
            <h3 className={s.title}>{st.title}</h3>
            <p className={s.text}>{st.text}</p>
            <div className={s.art}>{st.art}</div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
