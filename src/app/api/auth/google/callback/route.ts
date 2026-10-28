import { NextResponse } from 'next/server';
import { finishGoogle, OAuthError } from '@/lib/google-oauth';
import { AuthError, coordinatorFromGoogle, linkGoogleToOrg, volunteerFromGoogle } from '@/lib/accounts';

// Google sends the browser back here with ?code&state. Errors go back to the
// sign-in page as a short code (never Google's own text) that it explains.
export async function GET(req: Request) {
  const url = new URL(req.url);
  let back = '/signin';
  try {
    const { identity, intent, next } = await finishGoogle(url.searchParams);
    back = intent === 'vol' ? '/signin' : intent === 'link' ? '/org/settings' : '/signin?as=org';
    const to =
      intent === 'vol'
        ? await volunteerFromGoogle(identity, next)
        : intent === 'link'
          ? await linkGoogleToOrg(identity)
          : await coordinatorFromGoogle(identity, next);
    return NextResponse.redirect(new URL(to, url));
  } catch (e) {
    const code =
      e instanceof AuthError ? (e.message.includes('different Google') ? 'other_google' : 'link_first') : e instanceof OAuthError ? (url.searchParams.get('error') ? 'cancelled' : 'google') : null;
    if (!code) throw e;
    return NextResponse.redirect(new URL(`${back}${back.includes('?') ? '&' : '?'}error=${code}`, url));
  }
}
