import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { currentOrg } from '@/lib/session';
import { getEvent } from '@/lib/org-data';
import { DIRECT_KINDS, eventMediaPrefix, usesBlob, type DirectKind } from '@/lib/media';
import { limitByIp, rateLimited } from '@/lib/rate-limit';

// Signs a one-off token so the browser can put a video or voice note straight into
// the private Blob store. A serverless request body stops at 4.5 MB, so a clip
// can't pass through our own function on the way in. The token only allows this
// event's prefix, the kind's file types and its size cap, and runs out in ten
// minutes. The clips and notes routes then check the finished upload again
// before saving it (adoptDirectUpload).
export async function POST(req: Request, { params }: RouteContext<'/api/org/events/[id]/story/upload'>) {
  if (!usesBlob()) return NextResponse.json({ error: 'Direct uploads are off on this server.' }, { status: 404 });
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const event = await getEvent(org.id, id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  try {
    await limitByIp('story-upload', 60, 3600);
  } catch (e) {
    const r = rateLimited(e);
    if (r) return r;
    throw e;
  }

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body || body.type !== 'blob.generate-client-token') return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = clientPayload as DirectKind;
        const rule = DIRECT_KINDS[kind];
        if (!rule) throw new Error('Unknown upload kind.');
        if (!pathname.startsWith(eventMediaPrefix(id)) || pathname.includes('..')) throw new Error('Wrong upload path.');
        return {
          allowedContentTypes: [...rule.types],
          maximumSizeInBytes: rule.max,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload refused.' }, { status: 400 });
  }
}
