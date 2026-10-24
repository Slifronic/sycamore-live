import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { addManual, RuleError } from '@/lib/org-data';
import type { SheetDraft } from '@/lib/types';

// Contract: { rows: SheetDraft[] } (only the rows the coordinator confirmed)
// → { attendance }. Saved with method 'paper_import' and the AI's confidence.
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/import-sheet/confirm'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { rows?: SheetDraft[] } | null;
  if (!body?.rows?.length) return NextResponse.json({ error: 'No rows confirmed.' }, { status: 400 });

  const saved = [];
  try {
    for (const r of body.rows) {
      if (!r.checked_in_at) throw new RuleError(`${r.display_name || 'A row'} needs a time in before it can be saved.`);
      saved.push(
        await addManual(org.id, id, {
          display_name: r.display_name,
          checked_in_at: new Date(r.checked_in_at),
          checked_out_at: r.checked_out_at ? new Date(r.checked_out_at) : null,
          method: 'paper_import',
          ai_confidence: Math.round(Math.max(0, Math.min(1, r.confidence)) * 100) / 100,
        }),
      );
    }
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ error: e.message, saved: saved.length }, { status: 400 });
    throw e;
  }
  return NextResponse.json({ attendance: saved });
}
