'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { MessageError, markThreadRead, resolveAudience, runAutomations, saveAutomation, sendBroadcast, sendDirect, type AutomationKey } from '@/lib/messages';
import { draftBroadcast, factsFor } from '@/lib/messages-ai';
import { markChatRead, postAsOrg } from '@/lib/event-chat';

export type MsgState = { error?: string; ok?: string; sentAt?: number } | null;
export type DraftState = { error?: string; title?: string; body?: string; flags?: string[]; at?: number } | null;

const UUID = /^[0-9a-f-]{36}$/;

async function guard<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof MessageError) return { error: e.message };
    throw e;
  }
}

export async function sendMessage(_: MsgState, form: FormData): Promise<MsgState> {
  const org = await requireOrg();
  const vid = String(form.get('volunteer_id') ?? '');
  if (!UUID.test(vid)) return { error: 'Pick who to write to.' };
  const r = await guard(() => sendDirect(org, vid, String(form.get('body') ?? '')));
  if (r && 'error' in r) return r;
  revalidatePath('/org/messages');
  return { ok: 'Sent', sentAt: Date.now() };
}

export async function markRead(volunteerId: string) {
  const org = await requireOrg();
  if (!UUID.test(volunteerId)) return;
  await markThreadRead(org.id, volunteerId);
  revalidatePath('/org', 'layout');
}

export async function postEventChat(_: MsgState, form: FormData): Promise<MsgState> {
  const org = await requireOrg();
  const eventId = String(form.get('event_id') ?? '');
  if (!UUID.test(eventId)) return { error: 'Pick an event.' };
  const r = await guard(() => postAsOrg(org, eventId, String(form.get('body') ?? '')));
  if (r && 'error' in r) return r;
  revalidatePath(`/org/messages/events/${eventId}`);
  return { ok: 'Posted', sentAt: Date.now() };
}

export async function markEventChatRead(eventId: string) {
  await requireOrg();
  if (!UUID.test(eventId)) return;
  await markChatRead(eventId, 'org');
  revalidatePath('/org', 'layout');
}

export async function sendBroadcastAction(_: MsgState, form: FormData): Promise<MsgState> {
  const org = await requireOrg();
  const eventId = String(form.get('event_id') ?? '');
  const r = await guard(() =>
    sendBroadcast(org, {
      title: String(form.get('title') ?? ''),
      body: String(form.get('body') ?? ''),
      audience: String(form.get('audience') ?? ''),
      event_id: UUID.test(eventId) ? eventId : null,
    }),
  );
  if ('error' in r) return r;
  revalidatePath('/org/messages', 'layout');
  redirect(`/org/messages/broadcasts?sent=${r.id}`);
}

export async function draftBroadcastAction(_: DraftState, form: FormData): Promise<DraftState> {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const eventId = String(form.get('event_id') ?? '');
  const event = UUID.test(eventId) ? ins.events.find((e) => e.id === eventId) : undefined;
  const r = await guard(async () => {
    const { label } = await resolveAudience(org.id, String(form.get('audience') ?? 'all'), ins);
    return draftBroadcast(factsFor(org, label, event), String(form.get('note') ?? ''));
  });
  if ('error' in r) return r;
  return { ...r, at: Date.now() };
}

export async function saveAutomationAction(_: MsgState, form: FormData): Promise<MsgState> {
  const org = await requireOrg();
  const key = String(form.get('key') ?? '') as AutomationKey;
  const r = await guard(() => saveAutomation(org, key, form.get('enabled') === 'on', String(form.get('body') ?? '')));
  if (r && 'error' in r) return r;
  revalidatePath('/org/messages/automations');
  return { ok: form.get('enabled') === 'on' ? 'Saved. It’s on.' : 'Saved. It’s off.' };
}

export async function runAutomationsAction(_: MsgState, form: FormData): Promise<MsgState> {
  const org = await requireOrg();
  const only = (String(form.get('key') ?? '') || undefined) as AutomationKey | undefined;
  const result = await runAutomations(org, only);
  const total = Object.values(result).reduce((s, n) => s + n, 0);
  revalidatePath('/org', 'layout');
  if (Object.keys(result).length === 0) return { error: 'No automations are on. Switch one on first.' };
  return { ok: total === 0 ? 'Ran. Nobody new needed a message.' : `Ran. Sent ${total} ${total === 1 ? 'message' : 'messages'}.`, sentAt: Date.now() };
}
