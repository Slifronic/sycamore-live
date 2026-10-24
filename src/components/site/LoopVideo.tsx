'use client';

import { useEffect, useRef } from 'react';
import s from './frames.module.css';

// Muted ambient loop. Under reduced motion it stays paused on its poster.
export function LoopVideo({ src, poster }: { src: string; poster?: string }) {
  const el = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = el.current;
    if (!v) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (mq.matches) v.pause();
      else v.play().catch(() => {});
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return <video ref={el} className={s.video} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" />;
}
