import { ImageResponse } from 'next/og';
import { publicEvent } from '@/lib/event-public';
import { fmtTime } from '@/lib/format';
import { C, OG_SIZE, OgFrame, SERIF, clip, ogFonts } from '@/components/og/og';

export const alt = 'A volunteer event on SycaMore Live';
export const size = OG_SIZE;
export const contentType = 'image/png';

const longDay = (d: Date) => new Date(d).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'long', day: 'numeric' });

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const e = await publicEvent((await params).slug);
  const fonts = await ogFonts();
  if (!e) {
    return new ImageResponse(
      <OgFrame>
        <span style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 600, color: C.canopy }}>Event not found</span>
      </OgFrame>,
      { ...size, fonts },
    );
  }
  const place = e.place_name ?? e.location;
  return new ImageResponse(
    (
      <OgFrame
        left={<span>Scan in at the sign-in table · your hours count</span>}
        right={<span>{clip(e.org_name, 34)}</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: C.sap }}>{clip(e.org_name, 50).toUpperCase()}</span>
          <span style={{ fontFamily: SERIF, fontSize: e.title.length > 34 ? 64 : 80, fontWeight: 600, color: C.canopy, lineHeight: 1.04, letterSpacing: -2, maxWidth: 1040 }}>{clip(e.title, 70)}</span>
          <span style={{ fontSize: 34, color: C.ink, fontWeight: 700 }}>
            {longDay(e.starts_at)} · {fmtTime(e.starts_at)} to {fmtTime(e.ends_at)}
          </span>
          {place && <span style={{ fontSize: 30, color: C.ink2 }}>{clip(place, 70)}</span>}
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
