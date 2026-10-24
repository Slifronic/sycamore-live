import { NextResponse } from 'next/server';
import { publicRecord, recordByCode } from '@/lib/vol-data';

// Contract: public, no cookie. GET → { record: RecordView } or 404.
export async function GET(_: Request, { params }: RouteContext<'/api/v/[code]'>) {
  const { code } = await params;
  const r = await recordByCode(code);
  if (!r) return NextResponse.json({ error: 'No record with this code.' }, { status: 404 });
  return NextResponse.json({ record: publicRecord(r) }, { headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
