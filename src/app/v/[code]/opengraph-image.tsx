import { ImageResponse } from 'next/og';
import { recordByCode } from '@/lib/vol-data';
import { fmtHours } from '@/lib/hours';
import { longDate } from '@/components/vol/RecordWording';
import { C, OG_SIZE, OgFrame, SERIF, Tick, clip, ogFonts } from '@/components/og/og';

// The card a shared record unfurls into: who, how many hours, which
// organization, and whether it still stands. Unknown codes get a plain card.
export const alt = 'A SycaMore Live service record';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const r = await recordByCode((await params).code);
  const fonts = await ogFonts();
  if (!r) {
    return new ImageResponse(
      <OgFrame>
        <span style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 600, color: C.canopy }}>No record with this code</span>
      </OgFrame>,
      { ...size, fonts },
    );
  }
  const ok = r.status === 'active';
  const tone = ok ? C.verified : C.red;
  return new ImageResponse(
    (
      <OgFrame
        accent={tone}
        left={<span>{clip(`${r.event.title} · ${longDate(r.event.date)}`, 60)}</span>}
        right={<span>{r.code}</span>}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 780 }}>
            <div style={{ display: 'flex' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, background: ok ? C.verifiedSoft : C.redSoft, color: tone, fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
                {ok && <Tick color={tone} />}
                {ok ? 'VERIFIED' : 'REVOKED'}
              </span>
            </div>
            <span style={{ fontFamily: SERIF, fontSize: 78, fontWeight: 600, color: C.canopy, lineHeight: 1.02, letterSpacing: -2 }}>{clip(r.volunteer_name, 28)}</span>
            <span style={{ fontSize: 32, color: C.ink2 }}>{ok ? `Issued by ${clip(r.org.name, 40)}` : `Withdrawn by ${clip(r.org.name, 40)}`}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 250, height: 250, borderRadius: 999, background: tone, color: '#f6f5f0', boxShadow: '0 20px 40px -20px rgba(15,38,27,0.5)' }}>
            <span style={{ fontFamily: SERIF, fontSize: 104, fontWeight: 600, lineHeight: 1 }}>{fmtHours(r.hours_total)}</span>
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: 1.5, marginTop: 8 }}>{ok ? 'VERIFIED HOURS' : 'HOURS'}</span>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
