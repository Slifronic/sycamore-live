import { ImageResponse } from 'next/og';
import { getPublishedCampaign } from '@/lib/story';
import { C, OG_SIZE, OgFrame, SERIF, Tick, clip, ogFonts } from '@/components/og/og';

// A published campaign unfurls with its headline and the attested facts only.
export const alt = 'A volunteer story on SycaMore Live';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getPublishedCampaign((await params).slug);
  const fonts = await ogFonts();
  if (!c) {
    return new ImageResponse(
      <OgFrame>
        <span style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 600, color: C.canopy }}>Story not found</span>
      </OgFrame>,
      { ...size, fonts },
    );
  }
  const { draft, facts } = c;
  return new ImageResponse(
    (
      <OgFrame
        left={
          <>
            <Tick />
            <span style={{ color: C.verified, fontWeight: 700 }}>
              {facts.volunteers} volunteers · {facts.verified_hours} verified hours
            </span>
          </>
        }
        right={<span>{clip(facts.org.name, 34)}</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: C.sap }}>{clip(`${facts.event.title} · ${facts.event.date}`, 60).toUpperCase()}</span>
          <span style={{ fontFamily: SERIF, fontSize: draft.headline.length > 48 ? 60 : 74, fontWeight: 600, color: C.canopy, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1060 }}>{clip(draft.headline, 90)}</span>
          {draft.subhead && <span style={{ fontSize: 30, color: C.ink2, maxWidth: 1000, lineHeight: 1.35 }}>{clip(draft.subhead, 140)}</span>}
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
