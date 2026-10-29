'use client';

import { useEffect, useRef } from 'react';
import type { GroveColors, GroveHandle } from './grove-scene';
import s from './grove-hero.module.css';

// Mounts the Three.js grove behind the hero copy. The scene module (and
// three.js with it) loads only in the browser, after first paint, so the hero
// text and its CSS mist are on screen immediately. It pauses when the hero
// scrolls out of view or the tab is hidden, recolours when the palette
// changes, and renders a single still frame under reduced motion. Without
// WebGL the CSS mist simply stays.

function readColors(): GroveColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    sky: v('--site-sky', '#d5d9c6'),
    ground: v('--site-ground', '#8e9a76'),
    fog: v('--site-fog', '#c3c9b0'),
    moss: v('--site-moss', '#56723a'),
    bloom: v('--site-bloom', '#f4f2e6'),
    accent: v('--site-accent', '#c9b46a'),
    sap: v('--sap', '#6b8f45'),
  };
}

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function GroveCanvas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !webglOk()) return;
    let handle: GroveHandle | null = null;
    let cancelled = false;
    let visible = true;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sync = () => handle?.setActive(visible && document.visibilityState === 'visible');

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      sync();
    });
    const mo = new MutationObserver(() => handle?.setColors(readColors()));

    import('./grove-scene').then(({ mountGrove }) => {
      if (cancelled) return;
      handle = mountGrove(el, readColors(), { still });
      el.dataset.ready = 'true';
      io.observe(el);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-theme'] });
      document.addEventListener('visibilitychange', sync);
    });

    return () => {
      cancelled = true;
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', sync);
      handle?.dispose();
    };
  }, []);

  return <div ref={host} className={s.canvas} />;
}
