import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { listTags } from '@/lib/event-intake';

// Org addition: the org's tags, most-used first, for the tag picker and filters.
export async function GET() {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return NextResponse.json({ tags: await listTags(org.id) });
}
