import { ImageResponse } from 'next/og';
import { LeafMark } from '@/components/og/og';

// Home-screen icon: the leaf mark on canopy green, full bleed (iOS rounds it).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, #215a3d, #10281d)' }}>
        <LeafMark size={124} color="#e9f3ec" veins="#1d4b35" />
      </div>
    ),
    size,
  );
}
