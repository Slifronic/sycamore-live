import { currentVia, rememberVia, recordView } from '@/lib/impact';
import { cleanVia, countedPath } from '@/lib/impact-rules';
import { RateLimitError, limitByIp } from '@/lib/rate-limit';

// One page view from UsageBeacon: { p: pathname, via?: tag }. Always answers
// 204, so a failure here never shows on a page. A tag in the body (from a
// ?via= link) is remembered in a cookie for 30 days; see lib/impact.ts.
// 240 counted views per address per hour; past that the view isn't counted.

const NONE = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const path = countedPath(body?.p);
  const fresh = cleanVia(body?.via);
  try {
    if (fresh) await rememberVia(fresh);
    if (!path) return NONE;
    await limitByIp('beacon', 240, 3600);
    await recordView(path, fresh ?? (await currentVia()));
  } catch (e) {
    if (!(e instanceof RateLimitError)) console.error('beacon: not counted', e);
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
