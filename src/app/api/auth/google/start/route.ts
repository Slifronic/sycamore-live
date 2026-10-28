import { NextResponse } from 'next/server';
import { googleAuthUrl, googleOAuthReady, type GoogleIntent } from '@/lib/google-oauth';
import { safeOrgNext } from '@/lib/session';
import { safeNext } from '@/lib/vol-data';
import { limitByIp, RateLimitError } from '@/lib/rate-limit';

// GET /api/auth/google/start?intent=vol|org|link&next=/path
// Sends the browser to Google's account picker. `link` adds Google to the
// organization a PIN session is signed in to.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('intent');
  const intent: GoogleIntent = raw === 'org' || raw === 'link' ? raw : 'vol';
  const back = intent === 'vol' ? '/signin' : '/signin?as=org';
  if (!googleOAuthReady()) return NextResponse.redirect(new URL(`${back}${back.includes('?') ? '&' : '?'}error=not_ready`, url));
  try {
    await limitByIp('google-start', 30, 600);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.redirect(new URL(`${back}${back.includes('?') ? '&' : '?'}error=slow_down`, url));
    throw e;
  }
  const next = intent === 'vol' ? safeNext(url.searchParams.get('next')) : safeOrgNext(url.searchParams.get('next'));
  return NextResponse.redirect(await googleAuthUrl(intent, next));
}
