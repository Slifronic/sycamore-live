import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentOrg } from '@/lib/session';
import { attestEvent, RuleError, type AttestRow } from '@/lib/org-data';

// Contract: { rows: [{ attendance_id, role, hours_adjusted?, adjustment_reason?, no_show? }] }
// → { event, records }. Org additions (optional): standout per row, goal_outcome, cohort_rating.
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/attest'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { rows?: AttestRow[]; goal_outcome?: 'yes' | 'partly' | 'no'; cohort_rating?: number; outcome_text?: string };
  try {
    await attestEvent(org.id, id, b.rows ?? [], { goal_outcome: b.goal_outcome ?? null, cohort_rating: b.cohort_rating ?? null, outcome_text: b.outcome_text ?? null });
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const [event] = await sql`select * from event where id = ${id}`;
  const records = await sql`select r.* from record r join attendance a on a.id = r.attendance_id where a.event_id = ${id}`;
  return NextResponse.json({ event, records });
}
