import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { intakeFromFile, intakeFromText } from '@/lib/event-intake';

// Org addition: event intake. multipart { text } or { file } -> IntakeResult.
// Nothing is saved here; the result only fills in the New event form.
export async function POST(req: Request) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ kind: 'error', error: 'Sign in first.' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ kind: 'error', error: 'Send text or a file.' }, { status: 400 });
  const file = form.get('file');
  const result =
    file instanceof File && file.size > 0 ? await intakeFromFile(org.id, file) : await intakeFromText(org.id, String(form.get('text') ?? '').slice(0, 40_000));
  return NextResponse.json(result, { status: result.kind === 'error' ? 422 : 200 });
}
