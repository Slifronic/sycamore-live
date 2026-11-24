import 'server-only';
import { cookies } from 'next/headers';
import { safeEqual, secureCookies, sha256 } from './auth-tokens';
import { limitByIp } from './rate-limit';

// Who may open /impact: the SycaMore team, by a shared key (IMPACT_KEY in
// Vercel). Typing it once leaves a cookie holding a hash of the key, good for
// 30 days; changing IMPACT_KEY signs everyone out. Without IMPACT_KEY the page
// is open on a dev machine and closed in production.

const COOKIE = 'syc_impact';
const key = () => process.env.IMPACT_KEY?.trim() || null;
const proof = (k: string) => sha256(`sycamore-impact|${k}`);

export function impactConfigured(): boolean {
  return key() !== null || process.env.NODE_ENV !== 'production';
}

export async function hasImpactAccess(): Promise<boolean> {
  const k = key();
  if (!k) return process.env.NODE_ENV !== 'production';
  const got = (await cookies()).get(COOKIE)?.value;
  return !!got && safeEqual(got, proof(k));
}

/** Checks a typed key; ten tries per address per 15 minutes. True when it matched and the cookie is set. */
export async function grantImpactAccess(typed: unknown): Promise<boolean> {
  await limitByIp('impact-key', 10, 900);
  const k = key();
  if (!k || typeof typed !== 'string' || !safeEqual(typed.trim(), k)) return false;
  (await cookies()).set(COOKIE, proof(k), { httpOnly: true, sameSite: 'lax', secure: secureCookies(), path: '/', maxAge: 30 * 86_400 });
  return true;
}

export async function dropImpactAccess() {
  (await cookies()).delete(COOKIE);
}
