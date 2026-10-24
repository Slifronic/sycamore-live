import 'server-only';
import { cacheLife } from 'next/cache';
import { sql } from '@/lib/db';
import { publicRecord, recordByCode } from '@/lib/vol-data';
import type { RecordView } from '@/lib/types';

// The real, shared record the landing page shows in its hero card and links to
// as "See a verified record". It's whatever active shared record the database
// has (in the demo seed, Ana's planting record). If the database is down, the
// page still renders: the card says so and the link goes to /trust.

export async function featuredRecord(): Promise<RecordView | null> {
  'use cache';
  cacheLife('minutes');
  try {
    const rows = await sql`
      select code from record where code is not null and status = 'active'
      order by shared_at asc nulls last limit 1`;
    const code = rows[0]?.code as string | undefined;
    if (!code) return null;
    const r = await recordByCode(code);
    return r ? publicRecord(r) : null;
  } catch {
    return null;
  }
}
