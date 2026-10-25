import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { exportData } from '../../_account';

// "Download my data": a JSON file of the volunteer's own rows (profile,
// attendance, records, badges, messages, their event chat posts, saved events).
export async function GET() {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const data = await exportData(vid);
  if (!data) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="sycamore-my-data-${day}.json"`,
      'cache-control': 'no-store',
    },
  });
}
