'use server';

import { decideGuardian, decideHourRequest } from '@/lib/transcript';
import { VolError } from '@/lib/vol-data';
import { limitByIp, RateLimitError } from '@/lib/rate-limit';

// No account on these pages: the emailed token is the permission, and it works once.

export type DecideState = { error?: string; done?: 'confirmed' | 'declined' } | null;

export async function decideHours(token: string, _: DecideState, form: FormData): Promise<DecideState> {
  const confirm = form.get('decision') === 'confirm';
  try {
    await limitByIp('confirm', 30, 3600);
    await decideHourRequest(token, {
      confirm,
      name: String(form.get('name') ?? ''),
      role: String(form.get('role') ?? ''),
      hours: form.get('hours') ? Number(form.get('hours')) : undefined,
      reason: String(form.get('reason') ?? ''),
      not_related: form.get('not_related') === 'on',
    });
    return { done: confirm ? 'confirmed' : 'declined' };
  } catch (e) {
    if (e instanceof VolError || e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
}

export async function decideSharing(token: string, approve: boolean): Promise<DecideState> {
  try {
    await limitByIp('guardian-decide', 30, 3600);
    await decideGuardian(token, approve);
    return { done: approve ? 'confirmed' : 'declined' };
  } catch (e) {
    if (e instanceof VolError || e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
}
