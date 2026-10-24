import { NextResponse } from 'next/server';
import { VolError } from '@/lib/vol-data';

// Volunteer API errors: a VolError becomes { error } with its 4xx status;
// anything else is a real bug and is rethrown.
export function volError(e: unknown) {
  if (e instanceof VolError) return NextResponse.json({ error: e.message, ...(e.extra ?? {}) }, { status: e.status });
  throw e;
}

export const noStore = { 'cache-control': 'no-store' };
