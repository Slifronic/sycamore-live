import s from './ambient.module.css';

// Port of vengeance-ui's AnimatedRays: repeating stripes over a soft colour
// band, blurred and masked into one corner. The original slides
// background-position and needs a mounted check for its dark mode; this one
// moves two oversized layers with transform only, takes its colours from the
// theme tokens, renders on the server, and holds still under reduced motion.

export function Rays({ className, corner = 'right' }: { className?: string; corner?: 'right' | 'center' }) {
  return <div className={`${s.rays} ${corner === 'center' ? s.raysCenter : ''} ${className ?? ''}`} aria-hidden="true" />;
}
