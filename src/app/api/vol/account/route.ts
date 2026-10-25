import { NextResponse } from 'next/server';
import { currentVolunteerId, clearVolunteerCookie } from '@/lib/vol-session';
import { deleteAccount, setMarketingOptIn } from '../_account';

// The volunteer's account settings.
//   PATCH  { marketing_opt_in: boolean }   → { marketing_opt_in }
//   DELETE { confirm: 'DELETE' }           → { deleted: true } and forgets this device
// Deleting removes the volunteer, their messages and chat posts, and unlinks
// their attendance and records ("Former volunteer"), so the organization's
// attested totals survive as anonymous rows.
export async function PATCH(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.marketing_opt_in !== 'boolean') return NextResponse.json({ error: 'Send marketing_opt_in: true or false.' }, { status: 400 });
  const on = await setMarketingOptIn(vid, body.marketing_opt_in);
  if (on === null) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  return NextResponse.json({ marketing_opt_in: on });
}

export async function DELETE(req: Request) {
  const vid = await currentVolunteerId();
  if (!vid) return NextResponse.json({ error: 'Join first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  const done = await deleteAccount(vid);
  await clearVolunteerCookie();
  if (!done) return NextResponse.json({ error: 'That account is already gone.' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
