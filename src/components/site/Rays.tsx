import s from './ambient.module.css';

// The site's light backdrop: drifting banks of pale mist and a little slanted
// sun-dapple through leaves, masked into one corner (or the top centre). It
// began as a port of vengeance-ui's AnimatedRays and keeps its name and props;
// now it moves two oversized layers with transform only, takes every colour
// from the palette's --site-* tokens, renders on the server, and holds still
// under reduced motion.

export function Rays({ className, corner = 'right' }: { className?: string; corner?: 'right' | 'center' }) {
  return <div className={`${s.rays} ${corner === 'center' ? s.raysCenter : ''} ${className ?? ''}`} aria-hidden="true" />;
}
