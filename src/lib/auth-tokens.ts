import 'server-only';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// Random secrets for sessions, OAuth state and emailed codes. Only hashes go
// in the database; the raw value lives in a cookie or an email.

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Six digits, uniform, for an emailed sign-in code. */
export const sixDigits = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Cookies are Secure everywhere but plain-http localhost. */
export const secureCookies = () => process.env.NODE_ENV === 'production';
