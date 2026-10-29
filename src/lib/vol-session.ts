import 'server-only';
import { endSession, readSession, startSession } from './auth-session';

// Volunteer sign-in: a server-side session (see auth-session.ts) that names
// the volunteer. Callers only ever see the volunteer id.

export async function currentVolunteerId(): Promise<string | null> {
  return (await readSession('vol'))?.volunteer_id ?? null;
}

export async function setVolunteerCookie(volunteerId: string) {
  await startSession('vol', { volunteer_id: volunteerId });
}

export async function clearVolunteerCookie() {
  await endSession('vol');
}
