import { Leaf } from '../media/Leaf';
import s from './brand.module.css';

// The one SycaMore mark on the public site: the sycamore leaf the volunteer
// bar, /join and /v use, then the name. "Live" is plain text, not a badge.
// `tone="panel"` is for the dark footer panel, which stays dark in both themes.

export function BrandMark({ size = 22, tone = 'page', live = true }: { size?: number; tone?: 'page' | 'panel'; live?: boolean }) {
  const panel = tone === 'panel';
  return (
    <span className={`${s.mark} ${panel ? s.panel : ''}`}>
      <Leaf size={size} color={panel ? '#8fcca6' : 'var(--canopy)'} veins={panel ? 'rgba(15, 38, 27, 0.55)' : undefined} className={s.leaf} />
      <span className={s.name}>SycaMore</span>
      {live && <span className={s.live}>Live</span>}
    </span>
  );
}
