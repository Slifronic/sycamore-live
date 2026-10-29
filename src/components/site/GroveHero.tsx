import type { ReactNode } from 'react';
import { GroveCanvas } from './GroveCanvas';
import s from './grove-hero.module.css';

// The home page hero: a living grove in Three.js (GroveCanvas) behind the copy.
// Everything here renders on the server and reads fine before the scene loads,
// with JavaScript off, or without WebGL: the mist gradient and veil are CSS.
//
//   <GroveHero eyebrow="…" title={<>…</>} lede="…" actions={<…/>} aside={<…/>} />

export function GroveHero({
  eyebrow,
  title,
  lede,
  actions,
  aside,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede: ReactNode;
  actions: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className={s.hero} aria-labelledby="grove-title">
      <div className={s.sky} aria-hidden />
      <GroveCanvas />
      <div className={s.veil} aria-hidden />
      <div className={s.inner}>
        <div className={s.copy}>
          {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
          <h1 id="grove-title" className={s.title}>
            {title}
          </h1>
          <div className={s.lede}>{lede}</div>
          <div className={s.actions}>{actions}</div>
        </div>
        {aside && <div className={s.aside}>{aside}</div>}
      </div>
      <a href="#after-hero" className={s.cue}>
        <span>Discover</span>
        <i aria-hidden />
      </a>
      <span id="after-hero" className={s.anchor} />
    </section>
  );
}
