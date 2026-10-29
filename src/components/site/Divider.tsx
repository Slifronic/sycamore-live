import s from './botanical.module.css';

// An organic edge for a band: a soft wave, or a canopy line (the bumpy
// silhouette of tree crowns). It sits just outside the band's top or bottom
// edge and is filled with the band's own surface (--div-fill, default
// --surface-2), so the band seems to grow out of the page. Decorative.

const WAVE = 'M0 80 V46 C160 14 330 10 520 36 S880 76 1080 50 S1330 18 1440 32 V80 Z';

// Crowns of varying width and height, deterministic so server and client agree.
function canopy() {
  const widths = [96, 132, 88, 150, 110, 124, 92, 140, 104, 118, 86, 136, 98, 146];
  const heights = [34, 52, 28, 60, 40, 48, 30, 56, 38, 50, 26, 58, 36, 44];
  let x = -20;
  let d = 'M0 80 V60';
  let i = 0;
  while (x < 1460) {
    const w = widths[i % widths.length];
    const h = heights[i % heights.length];
    d += ` Q${x + w / 2} ${80 - h * 1.5} ${x + w} 60`;
    x += w;
    i++;
  }
  return `${d} V80 Z`;
}
const CANOPY = canopy();

export function Divider({ edge = 'top', shape = 'wave', className }: { edge?: 'top' | 'bottom'; shape?: 'wave' | 'canopy'; className?: string }) {
  return (
    <svg
      className={`${s.divider} ${edge === 'top' ? s.top : s.bottom} ${shape === 'canopy' ? s.tall : ''} ${className ?? ''}`}
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={shape === 'canopy' ? CANOPY : WAVE} />
    </svg>
  );
}
