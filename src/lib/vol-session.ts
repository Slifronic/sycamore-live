import 'server-only';
import { cookies } from 'next/headers';

// Demo-grade volunteer identity from the contract: the httpOnly `vid` cookie
// holds the volunteer id. Real auth (magic links) is out of scope this weekend.
const UUID = /^[0-9a-f-]{36}$/;

export async function currentVolunteerId(): Promise<string | null> {
  const vid = (await cookies()).get('vid')?.value;
  return vid && UUID.test(vid) ? vid : null;
}

export async function setVolunteerCookie(volunteerId: string) {
  (await cookies()).set('vid', volunteerId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
}

export async function clearVolunteerCookie() {
  (await cookies()).delete('vid');
}
