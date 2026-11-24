import 'server-only';
import { cookies } from 'next/headers';
import { secureCookies } from './auth-tokens';
import { cleanVia } from './impact-rules';

// The shared-link tag (?via=bryant), kept in a first-party cookie for 30 days
// so a sign-up or an "I applied" in that time can say which invitation it came
// from. It names a link, not a person. See lib/impact.ts.

export const VIA_COOKIE = 'syc_via';

/** The tag this browser arrived with, if any. */
export async function currentVia(): Promise<string | null> {
  return cleanVia((await cookies()).get(VIA_COOKIE)?.value);
}

export async function rememberVia(via: string) {
  (await cookies()).set(VIA_COOKIE, via, { httpOnly: true, sameSite: 'lax', secure: secureCookies(), path: '/', maxAge: 30 * 86_400 });
}

/** For a new account: the tag, or null when there's none or no request to read it from. */
export async function signupVia(): Promise<string | null> {
  try {
    return await currentVia();
  } catch {
    return null;
  }
}
