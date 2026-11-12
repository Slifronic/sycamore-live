import { NextResponse } from 'next/server';
import { visitOpportunity } from '@/lib/opportunities';
import { RateLimitError, limitByIp } from '@/lib/rate-limit';

// The outbound link of a public listing. It redirects to the URL stored for
// that slug and to nothing else: no part of the request chooses the
// destination, so it can't be used as an open redirect. An unknown or hidden
// slug goes back to the board.
//
// Clicks are counted (opportunity.outbound_clicks) so the list can be pruned.
// One address can add at most 30 counted clicks an hour; past that the visitor
// is still redirected, the click just isn't counted, so a script can't inflate
// a listing's number cheaply and a person is never blocked from the link.

const HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

export async function GET(req: Request, { params }: RouteContext<'/opportunities/go/[slug]'>) {
  const { slug } = await params;
  let count = true;
  try {
    await limitByIp('opp-go', 30, 3600);
  } catch (e) {
    if (!(e instanceof RateLimitError)) throw e;
    count = false;
  }
  const url = await visitOpportunity(slug, count);
  return NextResponse.redirect(url ?? new URL('/opportunities', req.url), { status: 302, headers: HEADERS });
}
