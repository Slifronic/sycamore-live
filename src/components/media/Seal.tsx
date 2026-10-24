import { LEAF_PATH, LEAF_VEINS } from './Leaf';
import s from './seal.module.css';

// A wax-style seal pressed onto a public record or badge. It stamps in once
// (scale + rotate settling, CSS only) and is plainly there without JS, in
// print, and with reduced motion. Green for verified, red for revoked: the
// colour is the state.

const R_OUT = 58;
const R_IN = 53;
const BUMPS = 28;
const edge = (() => {
  const pts: string[] = [];
  for (let i = 0; i < BUMPS * 2; i++) {
    const a = (Math.PI * i) / BUMPS - Math.PI / 2;
    const r = i % 2 === 0 ? R_OUT : R_IN;
    pts.push(`${(60 + r * Math.cos(a)).toFixed(2)} ${(60 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

export function Seal({ state = 'verified', label, size = 120, className = '' }: { state?: 'verified' | 'revoked'; label?: string; size?: number; className?: string }) {
  const ring = label ?? (state === 'verified' ? 'Verified record · attested by the organization · ' : 'Revoked · withdrawn by the organization · ');
  const id = `seal-ring-${state}`;
  return (
    <span className={`${s.seal} ${state === 'revoked' ? s.revoked : s.verified} ${className}`} style={{ width: size, height: size }} role="img" aria-label={state === 'verified' ? 'Verified seal' : 'Revoked seal'}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <defs>
          <path id={id} d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" />
          <radialGradient id={`${id}-g`} cx="38%" cy="32%" r="75%">
            <stop offset="0" className={s.hi} />
            <stop offset="1" className={s.lo} />
          </radialGradient>
        </defs>
        <path d={edge} fill={`url(#${id}-g)`} className={s.edge} />
        <circle cx="60" cy="60" r="48" fill="none" className={s.rule} strokeWidth="1" />
        <circle cx="60" cy="60" r="33" fill="none" className={s.rule} strokeWidth="1" />
        <text className={s.ringText}>
          <textPath href={`#${id}`} startOffset="0" textLength={2 * Math.PI * 41 - 4} lengthAdjust="spacing">
            {ring.toUpperCase()}
          </textPath>
        </text>
        {state === 'verified' ? (
          <g transform="translate(41 38) scale(0.6)">
            <path d={LEAF_PATH} className={s.leaf} strokeWidth="2.4" strokeLinejoin="round" />
            <path d={LEAF_VEINS} fill="none" className={s.vein} strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : (
          <path d="M46 46 L74 74 M74 46 L46 74" className={s.cross} strokeWidth="7" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}
