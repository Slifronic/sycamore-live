import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { addManual, RuleError } from '@/lib/org-data';

// Contract: { display_name, checked_in_at, checked_out_at? } → { attendance }, method 'coordinator'.
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/manual'>) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { display_name?: string; checked_in_at?: string; checked_out_at?: string };
  try {
    const attendance = await addManual(org.id, id, {
      display_name: b.display_name ?? '',
      checked_in_at: b.checked_in_at ? new Date(b.checked_in_at) : new Date(),
      checked_out_at: b.checked_out_at ? new Date(b.checked_out_at) : null,
    });
    return NextResponse.json({ attendance }, { status: 201 });
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
