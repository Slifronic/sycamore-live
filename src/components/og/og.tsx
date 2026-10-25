import 'server-only';
import { LEAF_PATH, LEAF_VEINS } from '@/components/media/Leaf';

// Shared pieces for the Open Graph images (next/og, Satori). Satori wants
// inline styles and display:flex on anything with more than one child.

export const OG_SIZE = { width: 1200, height: 630 };

export const C = {
  parchment: '#f6f5f0',
  paper: '#fffdf8',
  ink: '#10281d',
  ink2: '#55665b',
  canopy: '#1d4b35',
  sap: '#2c8a57',
  verified: '#155030',
  verifiedSoft: '#d9efe0',
  red: '#8a2b21',
  redSoft: '#f8e0dd',
  line: '#e2e0d6',
};

// Fraunces for headings, fetched once from Google Fonts as TTF. If the network
// is down, the image still renders in the bundled sans font.
type Font = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: 'normal' };
let fontsPromise: Promise<Font[]> | null = null;

async function google(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, { signal: AbortSignal.timeout(3000) }).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url, { signal: AbortSignal.timeout(4000) }).then((r) => (r.ok ? r.arrayBuffer() : null));
  } catch {
    return null;
  }
}

export function ogFonts(): Promise<Font[]> {
  fontsPromise ??= (async () => {
    const [serif, sans, sansBold] = await Promise.all([google('Fraunces', 600), google('Plus+Jakarta+Sans', 500), google('Plus+Jakarta+Sans', 700)]);
    const out: Font[] = [];
    if (serif) out.push({ name: 'Fraunces', data: serif, weight: 600, style: 'normal' });
    if (sans) out.push({ name: 'Jakarta', data: sans, weight: 400, style: 'normal' });
    if (sansBold) out.push({ name: 'Jakarta', data: sansBold, weight: 700, style: 'normal' });
    if (!out.length) fontsPromise = null; // try again next time
    return out;
  })();
  return fontsPromise;
}

export const SERIF = 'Fraunces, serif';
export const SANS = 'Jakarta, sans-serif';

export function LeafMark({ size = 40, color = C.canopy, veins = '#f6f5f0' }: { size?: number; color?: string; veins?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d={LEAF_PATH} fill={color} stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={LEAF_VEINS} fill="none" stroke={veins} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Parchment card with the brand line at the top and a footer line. */
export function OgFrame({ children, left, right, accent = C.canopy }: { children: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode; accent?: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.parchment, padding: 56, fontFamily: SANS, color: C.ink, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: accent, display: 'flex' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <LeafMark size={44} />
        <span style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, color: C.canopy }}>SycaMore Live</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>{children}</div>
      {(left || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, fontSize: 24, color: C.ink2, borderTop: `2px solid ${C.line}`, paddingTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{left}</div>
          <div style={{ display: 'flex', fontWeight: 700, color: C.ink }}>{right}</div>
        </div>
      )}
    </div>
  );
}

/** A tick drawn as SVG (the fonts have no check-mark glyph). */
export function Tick({ size = 22, color = C.verified }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M5 12.5 L10 17 L19 7" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
