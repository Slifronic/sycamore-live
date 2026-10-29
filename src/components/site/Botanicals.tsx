import type { CSSProperties } from 'react';
import s from './botanical.module.css';

// Hand-drawn botanical line drawings for the marketing site: a palmate
// sycamore leaf, a pair of winged seeds (samaras) and a fern frond. Strokes
// only, in the palette's --sap / --line tokens at low opacity, so they read as
// pencil marks on the paper and work in every palette. Decorative and
// aria-hidden. Each one sways slowly from its stem (CSS, transform only) and
// holds still under reduced motion.

export type BotanicalKind = 'leaf' | 'seed' | 'fern' | 'samara';

/* ── Sycamore leaf: five pointed lobes, curved edges, veins to each tip ── */
const LEAF_OUTLINE =
  'M100 166 Q88 169 78 160 Q46 158 16 124 Q42 118 62 112 Q32 88 30 50 Q64 62 84 84 Q84 42 100 10 Q116 42 116 84 Q136 62 170 50 Q168 88 138 112 Q158 118 184 124 Q154 158 122 160 Q112 169 100 166 Z';
const LEAF_VEINS = [
  'M100 166 Q101 96 100 18',
  'M100 150 Q74 104 36 56',
  'M100 150 Q126 104 164 56',
  'M100 158 Q62 148 24 125',
  'M100 158 Q138 148 176 125',
  // veinlets
  'M100 112 Q88 98 80 92',
  'M100 112 Q112 98 120 92',
  'M100 80 Q92 68 90 58',
  'M100 80 Q108 68 110 58',
  'M70 112 Q58 116 48 112',
  'M130 112 Q142 116 152 112',
  'M76 128 Q72 140 60 146',
  'M124 128 Q128 140 140 146',
];
const LEAF_STEM = 'M100 166 Q103 182 96 198';

/* ── Samaras: two nutlets joined at the top, wings spread in a V ── */
const SAMARA_PAIR = {
  nuts: ['M70 26 a11 13 -20 1 0 0.1 0 Z', 'M92 26 a11 13 20 1 0 0.1 0 Z'],
  wings: [
    'M64 34 C48 46 22 70 12 100 C8 112 20 118 30 108 C46 92 62 66 74 40',
    'M98 34 C114 46 140 70 150 100 C154 112 142 118 132 108 C116 92 100 66 88 40',
  ],
  veins: ['M66 40 Q40 70 20 104', 'M70 42 Q50 74 30 104', 'M96 40 Q122 70 142 104', 'M92 42 Q112 74 132 104'],
  stalk: 'M81 14 Q80 6 84 0',
};

/* ── One samara: a single winged seed, for the falling spin ── */
const SAMARA_ONE = {
  nut: 'M20 16 a9 11 0 1 0 0.1 0 Z',
  wing: 'M24 24 C36 40 46 66 44 92 C43 102 34 104 30 96 C24 80 18 52 16 28',
  veins: ['M22 30 Q34 60 38 94', 'M19 32 Q26 62 32 96'],
};

/* ── Fern frond: a curving rachis with alternate pinnae, shrinking to the tip ── */
function frond() {
  const P0 = [36, 312];
  const P1 = [40, 120];
  const P2 = [164, 22];
  const at = (t: number) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  const tan = (t: number) => {
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    const m = Math.hypot(dx, dy);
    return [dx / m, dy / m];
  };
  const r = (n: number) => Math.round(n * 10) / 10;
  const rot = ([x, y]: number[], a: number) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const pinnae: string[] = [];
  const N = 15;
  for (let i = 0; i < N; i++) {
    const t = 0.1 + (i / (N - 1)) * 0.84;
    const [px, py] = at(t);
    const d = tan(t);
    const L = 54 * (1 - t * 0.82);
    for (const side of [-1, 1]) {
      const dir = rot(d, side * 1.05);
      const n = [-dir[1], dir[0]];
      const tip = [px + dir[0] * L, py + dir[1] * L];
      const w = L * 0.2;
      const c1 = [px + dir[0] * L * 0.5 + n[0] * w, py + dir[1] * L * 0.5 + n[1] * w];
      const c2 = [px + dir[0] * L * 0.5 - n[0] * w, py + dir[1] * L * 0.5 - n[1] * w];
      pinnae.push(`M${r(px)} ${r(py)} Q${r(c1[0])} ${r(c1[1])} ${r(tip[0])} ${r(tip[1])} Q${r(c2[0])} ${r(c2[1])} ${r(px)} ${r(py)}`);
    }
  }
  return { rachis: `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`, pinnae: pinnae.join(' ') };
}
const FERN = frond();

export function Botanical({ kind, className, style }: { kind: BotanicalKind; className?: string; style?: CSSProperties }) {
  const cls = `${s.drawing} ${s[kind]} ${className ?? ''}`;
  if (kind === 'leaf') {
    return (
      <svg viewBox="0 0 200 200" className={cls} style={style} aria-hidden="true" focusable="false">
        <path d={LEAF_OUTLINE} className={s.outline} />
        <path d={LEAF_VEINS.join(' ')} className={s.vein} />
        <path d={LEAF_STEM} className={s.outline} />
      </svg>
    );
  }
  if (kind === 'seed') {
    return (
      <svg viewBox="-4 -4 170 130" className={cls} style={style} aria-hidden="true" focusable="false">
        <path d={SAMARA_PAIR.wings.join(' ')} className={s.outline} />
        <path d={SAMARA_PAIR.veins.join(' ')} className={s.vein} />
        <path d={SAMARA_PAIR.nuts.join(' ')} className={s.nut} />
        <path d={SAMARA_PAIR.stalk} className={s.outline} />
      </svg>
    );
  }
  if (kind === 'samara') {
    return (
      <svg viewBox="0 0 60 110" className={cls} style={style} aria-hidden="true" focusable="false">
        <path d={SAMARA_ONE.wing} className={s.outline} />
        <path d={SAMARA_ONE.veins.join(' ')} className={s.vein} />
        <path d={SAMARA_ONE.nut} className={s.nut} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 320" className={cls} style={style} aria-hidden="true" focusable="false">
      <path d={FERN.rachis} className={s.outline} />
      <path d={FERN.pinnae} className={s.vein} />
    </svg>
  );
}

export type Sprig = {
  kind: BotanicalKind;
  /** Position inside the layer, as CSS lengths (e.g. '8%', '-40px'). */
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Width in px; height follows the drawing. */
  size: number;
  rotate?: number;
  /** Sway phase offset in seconds, so neighbours don't move in step. */
  delay?: number;
  /** Hide below 640px, where the page is narrow enough to feel busy. */
  wide?: boolean;
  /** 'soft' is fainter (behind text), 'ink' a little stronger (open space). */
  tone?: 'soft' | 'ink';
};

/** An absolutely positioned layer of a few drawings behind a section's content. */
export function Botanicals({ items, className }: { items: Sprig[]; className?: string }) {
  return (
    <div className={`${s.layer} ${className ?? ''}`} aria-hidden="true">
      {items.map((it, i) => (
        <span
          key={i}
          className={`${s.sprig} ${it.wide ? s.wide : ''} ${it.tone === 'ink' ? s.ink : it.tone === 'soft' ? s.soft : ''}`}
          style={
            {
              top: it.top,
              left: it.left,
              right: it.right,
              bottom: it.bottom,
              width: it.size,
              '--r': `${it.rotate ?? 0}deg`,
              '--sway-delay': `${-(it.delay ?? i * 2.3)}s`,
            } as CSSProperties
          }
        >
          <Botanical kind={it.kind} />
        </span>
      ))}
    </div>
  );
}

const FALLERS = [
  { left: '14%', top: '-4%', dur: 13, delay: 0.6, dx: 34, r: 14 },
  { left: '78%', top: '2%', dur: 15, delay: 4.2, dx: -28, r: -22 },
  { left: '56%', top: '-8%', dur: 17, delay: 8.8, dx: 20, r: 40 },
  { left: '30%', top: '6%', dur: 14, delay: 11.5, dx: -18, r: -6 },
];

/** A few single samaras that drift down and spin, now and then (the CTA). */
export function SamaraFall() {
  return (
    <div className={s.fall} aria-hidden="true">
      {FALLERS.map((f, i) => (
        <span
          key={i}
          className={s.faller}
          style={{ left: f.left, top: f.top, '--dur': `${f.dur}s`, '--delay': `${f.delay}s`, '--dx': `${f.dx}px`, '--r': `${f.r}deg` } as CSSProperties}
        >
          <span>
            <Botanical kind="samara" />
          </span>
        </span>
      ))}
    </div>
  );
}
