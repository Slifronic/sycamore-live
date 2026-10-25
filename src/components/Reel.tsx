'use client';

import { useEffect, useRef, useState } from 'react';
import s from './reel.module.css';

export type Shot = { src: string; poster?: string | null; start: number; end: number; caption: string };

// Plays a storyboard as one highlight reel: each shot is a range of a clip,
// with its caption on screen. One <video> element, swapped shot by shot.
export function Reel({ shots, label = 'Highlight reel' }: { shots: Shot[]; label?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const shot = shots[i];

  // Load the current shot and jump to its start.
  useEffect(() => {
    const v = video.current;
    if (!v || !shot) return;
    const seek = () => {
      v.currentTime = shot.start;
      if (playing) v.play().catch(() => setPlaying(false));
    };
    if (v.getAttribute('data-src') !== shot.src) {
      v.setAttribute('data-src', shot.src);
      v.src = shot.src;
      v.addEventListener('loadedmetadata', seek, { once: true });
    } else seek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, shot?.src, shot?.start]);

  if (!shots.length) return null;

  const onTime = () => {
    const v = video.current!;
    if (v.currentTime >= shot.end - 0.05) {
      if (i < shots.length - 1) setI(i + 1);
      else {
        v.pause();
        setPlaying(false);
        setI(0);
      }
    }
  };

  const toggle = () => {
    const v = video.current!;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      v.play().catch(() => setPlaying(false));
    }
  };

  return (
    <figure className={s.reel} aria-label={label}>
      <div className={s.frame}>
        <video
          ref={video}
          className={s.video}
          poster={shots[0].poster ?? undefined}
          muted={muted}
          playsInline
          preload="metadata"
          onTimeUpdate={onTime}
          onClick={toggle}
        />
        {shot.caption && (
          <figcaption key={i} className={s.caption}>
            {shot.caption}
          </figcaption>
        )}
        {!playing && (
          <button type="button" className={s.play} onClick={toggle} aria-label="Play highlight reel">
            <span className={s.tri} aria-hidden />
          </button>
        )}
      </div>
      <div className={s.controls}>
        <button type="button" className="btn btn-sm" onClick={toggle}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => setMuted((m) => !m)} aria-pressed={!muted}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
        <ol className={s.dots} aria-label="Shots">
          {shots.map((sh, n) => (
            <li key={n}>
              <button
                type="button"
                className={n === i ? `${s.dot} ${s.dotOn}` : s.dot}
                onClick={() => setI(n)}
                aria-label={`Shot ${n + 1}: ${sh.caption || 'no caption'}`}
                aria-current={n === i}
              />
            </li>
          ))}
        </ol>
        <span className="small muted num">
          {shots.reduce((t, sh) => t + Math.max(0, sh.end - sh.start), 0).toFixed(0)} s
        </span>
      </div>
    </figure>
  );
}
