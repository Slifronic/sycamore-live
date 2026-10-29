'use server';

import { revalidatePath } from 'next/cache';
import { currentVolunteerId } from '@/lib/vol-session';
import { VolError } from '@/lib/vol-data';
import { RateLimitError } from '@/lib/rate-limit';
import { createHourRequest, publishTranscript, requestGuardianApproval, resendHourRequest, unpublishTranscript } from '@/lib/transcript';

export type TxState = { error?: string; ok?: string } | null;

async function run(fn: (vid: string) => Promise<unknown>, ok: string): Promise<TxState> {
  const vid = await currentVolunteerId();
  if (!vid) return { error: 'Sign in first.' };
  try {
    await fn(vid);
  } catch (e) {
    if (e instanceof VolError || e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
  revalidatePath('/me/transcript');
  return { ok };
}

export async function requestHours(_: TxState, form: FormData): Promise<TxState> {
  return run(
    (vid) =>
      createHourRequest(vid, {
        org_name: form.get('org_name'),
        contact_name: form.get('contact_name'),
        contact_email: form.get('contact_email'),
        served_on: form.get('served_on'),
        hours: form.get('hours'),
        description: form.get('description'),
      }),
    'Sent. Your supervisor gets an email with a link to confirm.',
  );
}

export async function resendRequest(id: string): Promise<TxState> {
  return run((vid) => resendHourRequest(vid, id), 'Reminder sent.');
}

export async function askGuardian(_: TxState, form: FormData): Promise<TxState> {
  return run((vid) => requestGuardianApproval(vid, String(form.get('email') ?? '')), 'Sent. Sharing turns on as soon as they approve.');
}

export async function publish(): Promise<TxState> {
  return run(publishTranscript, 'Your transcript link is live.');
}

export async function unpublish(): Promise<TxState> {
  return run(unpublishTranscript, 'Link turned off. Anyone who opens it now sees nothing.');
}
