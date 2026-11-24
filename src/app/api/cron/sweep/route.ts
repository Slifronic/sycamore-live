import { createHash, timingSafeEqual } from 'node:crypto';
import { sweepExpired } from '@/lib/auth-session';
import { sweepVisitSalts } from '@/lib/impact';

// Daily clean-up, run by Vercel Cron (vercel.json). Sign-ins already sweep as they
// happen; this covers quiet weeks, so expired sessions, sign-in codes and old
// rate-limit rows (one per address that ever tried) don't pile up between them.
// It also deletes past days' visit-count salts (lib/impact.ts), as /privacy promises.
// Vercel sends `Authorization: Bearer $CRON_SECRET`; without the variable set, the
// route refuses everyone rather than running for anyone.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'CRON_SECRET is not set.' }, { status: 503 });
  const sent = req.headers.get('authorization') ?? '';
  const a = createHash('sha256').update(sent).digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  if (!timingSafeEqual(a, b)) return Response.json({ error: 'Not allowed.' }, { status: 401 });

  await sweepExpired();
  await sweepVisitSalts();
  return Response.json({ ok: true, swept_at: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}
