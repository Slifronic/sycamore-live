import { ImageResponse } from 'next/og';
import { C, OG_SIZE, OgFrame, SERIF, ogFonts } from '@/components/og/og';

export const alt = 'SycaMore Live: volunteer hours recorded as the event happens, verified by the organization.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame left={<span>Scan in · the organization verifies · share a record anyone can check</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <span style={{ fontFamily: SERIF, fontSize: 76, fontWeight: 600, color: C.canopy, lineHeight: 1.04, letterSpacing: -2, maxWidth: 940 }}>Volunteer hours, verified by the organization.</span>
          <span style={{ fontSize: 30, color: C.ink2, maxWidth: 900, lineHeight: 1.35 }}>Recorded as the event happens. Every volunteer gets a record a school or scholarship committee can check.</span>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
