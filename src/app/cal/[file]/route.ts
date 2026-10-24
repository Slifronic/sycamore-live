import { orgFeed } from '@/lib/event-public';

// Public but unguessable: an org's events as a calendar feed that Google,
// Apple and Outlook subscribe to. /cal/<token>.ics, optionally ?tag=Weekend.
export async function GET(req: Request, { params }: RouteContext<'/cal/[file]'>) {
  const file = (await params).file;
  const token = file.replace(/\.ics$/i, '');
  const tag = new URL(req.url).searchParams.get('tag')?.slice(0, 32) || null;
  const feed = await orgFeed(token, tag);
  if (!feed) return new Response('No calendar at this address.', { status: 404 });
  return new Response(feed.body, {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `inline; filename="${token.slice(0, 6)}.ics"`, 'cache-control': 'public, max-age=900' },
  });
}
