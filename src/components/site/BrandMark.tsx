import { Leaf } from '../media/Leaf';
import s from './brand.module.css';

// The one SycaMore mark on the public site: the sycamore leaf the volunteer
// bar, /join and /v use, then the name. "Live" is plain text, not a badge.
// `tone="panel"` sets the leaf in sap green for a quiet surface (the footer).

export function BrandMark({ size = 22, tone = 'page', live = true }: { size?: number; tone?: 'page' | 'panel'; live?: boolean }) {
  const panel = tone === 'panel';
  return (
    <span className={`${s.mark} ${panel ? s.panel : ''}`}>
      <Leaf size={size} color={panel ? 'var(--primary)' : 'var(--canopy)'} veins="color-mix(in srgb, var(--paper) 60%, transparent)" className={s.leaf} />
      <span className={s.name}>SycaMore</span>
      {live && <span className={s.live}>Live</span>}
    </span>
  );
}
