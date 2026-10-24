import { NextResponse } from 'next/server';
import { currentVolunteerId } from '@/lib/vol-session';
import { pendingAttendance, volunteerRecords } from '@/lib/vol-data';
import { noStore } from '../_respond';

// Contract: GET → { records: RecordView[], pending: Attendance[] }.
// Only the signed-in volunteer's own rows; practice events excluded.
// Pending rows carry no hour number: nothing is official until attested.
export async function GET() {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const [records, pending] = await Promise.all([volunteerRecords(vid), pendingAttendance(vid)]);
  return NextResponse.json({ records, pending }, { headers: noStore });
}
