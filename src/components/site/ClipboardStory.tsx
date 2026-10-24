'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import s from './story.module.css';

// "From clipboard to record": a pinned scroll story on wide screens, a plain
// stack everywhere else. The server HTML is the stack (each step carries its
// own picture), so it reads fine without JavaScript. On a wide screen the
// script switches on the sticky stage and lights the picture for whichever
// step is crossing the middle of the viewport.

export type StoryStep = { key: string; label: string; title: string; body: ReactNode; visual: ReactNode };

export function ClipboardStory({ steps }: { steps: StoryStep[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: root, offset: ['start center', 'end center'] });
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)');
    const sync = () => setLive(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!live || !node) return;
    const items = Array.from(node.querySelectorAll<HTMLElement>('[data-step]'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [live]);

  return (
    <div ref={root} className={s.story} data-live={live || undefined}>
      <ol className={s.steps}>
        {steps.map((st, i) => (
          <li key={st.key} className={s.step} data-step={i} data-active={live && active === i ? '' : undefined}>
            <div className={s.stepText}>
              <p className={s.stepLabel}>
                <span className={s.stepNum}>{String(i + 1).padStart(2, '0')}</span>
                {st.label}
              </p>
              <h3 className={s.stepTitle}>{st.title}</h3>
              <div className={s.stepBody}>{st.body}</div>
            </div>
            <div className={s.inlineVisual}>{st.visual}</div>
          </li>
        ))}
      </ol>
      {live && (
        <div className={s.stageWrap} aria-hidden="true">
          <div className={s.stage}>
            <div className={s.rail}>
              <motion.span className={s.railFill} style={{ scaleY: progress }} />
            </div>
            <div className={s.layers}>
              {steps.map((st, i) => (
                <div key={st.key} className={s.layer} data-on={active === i || undefined} data-past={active > i || undefined}>
                  {st.visual}
                </div>
              ))}
            </div>
            <ol className={s.dots}>
              {steps.map((st, i) => (
                <li key={st.key} data-on={active === i || undefined}>
                  {st.label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
