import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { volunteerChats } from '@/lib/event-chat';

// Volunteer side (owner: volunteer). Reference implementation; see
// build/00-SHARED-CONTRACT.md. One group chat per event the volunteer came to.
//   GET → { chats: VolChatSummary[], unread }
export async function GET() {
  const vid = (await cookies()).get('vid')?.value;
  if (!vid || !/^[0-9a-f-]{36}$/.test(vid)) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const chats = await volunteerChats(vid);
  return NextResponse.json({ chats, unread: chats.reduce((n, c) => n + c.unread, 0) }, { headers: { 'cache-control': 'no-store' } });
}
