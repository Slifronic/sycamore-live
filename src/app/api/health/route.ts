import { connection } from 'next/server';
import { sql } from '@/lib/db';

// For an uptime monitor (UptimeRobot, Better Stack, a Vercel check): 200 when the
// app can reach its database, 503 when it can't. It says nothing else about the
// deployment beyond the short commit, so it is safe to leave public.
export async function GET() {
  await connection();
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
  const started = Date.now();
  try {
    await sql`select 1`;
    return Response.json({ ok: true, db: 'up', db_ms: Date.now() - started, commit }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, db: 'down', commit }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
