import 'server-only';
import { headers } from 'next/headers';
import { sql } from './db';

// Fixed-window limits kept in Postgres, so they hold across serverless
// instances. One upsert per check; stale rows are reused, never piled up.

export class RateLimitError extends Error {
  constructor(readonly retryAfterSec: number) {
    super(`Too many tries. Wait ${retryAfterSec < 90 ? `${retryAfterSec} seconds` : `${Math.ceil(retryAfterSec / 60)} minutes`} and try again.`);
  }
}

/** Counts one hit against `key`; throws RateLimitError past `limit` hits per `windowSec`. */
export async function limit(key: string, max: number, windowSec: number) {
  const [r] = (await sql`
    insert into rate_limit (key, window_start, hits) values (${key}, now(), 1)
    on conflict (key) do update set
      hits = case when rate_limit.window_start < now() - make_interval(secs => ${windowSec}) then 1 else rate_limit.hits + 1 end,
      window_start = case when rate_limit.window_start < now() - make_interval(secs => ${windowSec}) then now() else rate_limit.window_start end
    returning hits, extract(epoch from (window_start + make_interval(secs => ${windowSec}) - now()))::int as left`) as unknown as {
    hits: number;
    left: number;
  }[];
  if (r!.hits > max) throw new RateLimitError(Math.max(1, r!.left));
}

/** The caller's IP as Vercel (or a local proxy) reports it. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim().slice(0, 64);
}

/** Convenience: limit by IP under a named bucket. */
export async function limitByIp(bucket: string, max: number, windowSec: number) {
  await limit(`${bucket}:ip:${await clientIp()}`, max, windowSec);
}

/**
 * Every call that spends model tokens goes through this: a per-org (or
 * per-volunteer) daily allowance, a per-address hourly one, and a site-wide
 * daily ceiling (AI_DAILY_LIMIT, default 2,000) that turns AI drafting off for
 * everyone before a runaway bill does. Set a spend limit on the API key too.
 */
export async function limitAi(scope: string, perDay = 60) {
  await limit(`ai:${scope}`, perDay, 86_400);
  await limitByIp('ai', 120, 3600);
  await limit('ai:site', Number(process.env.AI_DAILY_LIMIT) || 2000, 86_400);
}

/** Maps a RateLimitError to a 429 JSON response (null for anything else). */
export function rateLimited(e: unknown, key: 'error' = 'error') {
  return e instanceof RateLimitError
    ? Response.json({ [key]: e.message }, { status: 429, headers: { 'retry-after': String(e.retryAfterSec) } })
    : null;
}
