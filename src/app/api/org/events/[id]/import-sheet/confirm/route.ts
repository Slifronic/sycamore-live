import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { addManual, RuleError } from '@/lib/org-data';
import { isUuid } from '@/lib/ids';
import type { SheetDraft } from '@/lib/types';

// Contract: { rows: SheetDraft[] } (only the rows the coordinator confirmed)
// → { attendance }. Saved with method 'paper_import' and the AI's confidence.
// All or nothing: one bad row saves none of them.
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/import-sheet/confirm'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { rows?: unknown } | null;
  const rows = body?.rows;
  if (!Array.isArray(rows) || !rows.length) return NextResponse.json({ error: 'No rows confirmed.' }, { status: 400 });
  if (rows.some((r) => !r || typeof r !== 'object')) return NextResponse.json({ error: 'Each row must be an object.' }, { status: 400 });

  try {
    const saved = await sql.begin(async (tx) => {
      const out = [];
      for (const r of rows as Partial<SheetDraft>[]) {
        const name = typeof r.display_name === 'string' ? r.display_name : '';
        if (!r.checked_in_at) throw new RuleError(`${name.trim() || 'A row'} needs a time in before it can be saved.`);
        const conf = Number(r.confidence);
        out.push(
          await addManual(
            org.id,
            id,
            {
              display_name: name,
              checked_in_at: new Date(String(r.checked_in_at)),
              checked_out_at: r.checked_out_at ? new Date(String(r.checked_out_at)) : null,
              method: 'paper_import',
              // A missing or garbled confidence counts as 0 (amber), never NaN.
              ai_confidence: Number.isFinite(conf) ? Math.round(Math.max(0, Math.min(1, conf)) * 100) / 100 : 0,
            },
            { db: tx },
          ),
        );
      }
      return out;
    });
    return NextResponse.json({ attendance: saved });
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ error: e.message, saved: 0 }, { status: e.status });
    throw e;
  }
}
