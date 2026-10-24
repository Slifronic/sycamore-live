'use server';

import { redirect } from 'next/navigation';
import { clearVolunteerCookie } from '@/lib/vol-session';

// "Not you?" on a shared phone: forget this volunteer on this device.
export async function volSignOut() {
  await clearVolunteerCookie();
  redirect('/join');
}
