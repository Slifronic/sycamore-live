// The SycaMore mark: a five-lobed sycamore leaf. One path, used by the app
// icon, the seal on public records and the Open Graph images.
export const LEAF_PATH =
  'M32 4 L37 15 L43 12 L41 24 L53 17 L50 28 L59 30 L49 38 L52 45 L38 42 L34 47 L33.2 47 L33.2 60 L30.8 60 L30.8 47 L30 47 L26 42 L12 45 L15 38 L5 30 L14 28 L11 17 L23 24 L21 12 L27 15 Z';
export const LEAF_VEINS = 'M32 47 V13 M32 40 L47 23 M32 40 L17 23 M32 44 L46 40 M32 44 L18 40';

export function Leaf({ size = 24, color = 'currentColor', veins = 'rgba(255,255,255,0.55)', className }: { size?: number; color?: string; veins?: string | null; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <path d={LEAF_PATH} fill={color} stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
      {veins && <path d={LEAF_VEINS} fill="none" stroke={veins} strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}
