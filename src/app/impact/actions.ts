'use server';

import { redirect } from 'next/navigation';
import { dropImpactAccess, grantImpactAccess } from '@/lib/impact-access';
import { RateLimitError } from '@/lib/rate-limit';

export async function unlockImpact(form: FormData) {
  try {
    if (await grantImpactAccess(form.get('key'))) redirect('/impact');
  } catch (e) {
    if (e instanceof RateLimitError) redirect('/impact?e=wait');
    throw e;
  }
  redirect('/impact?e=key');
}

export async function lockImpact() {
  await dropImpactAccess();
  redirect('/impact');
}
