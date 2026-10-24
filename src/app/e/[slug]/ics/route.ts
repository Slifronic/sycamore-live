import { eventIcs, publicEvent } from '@/lib/event-public';

// Public: one event as an .ics file ("Add to Apple Calendar" and any other app).
export async function GET(_req: Request, { params }: RouteContext<'/e/[slug]/ics'>) {
  const event = await publicEvent((await params).slug);
  if (!event) return new Response('No event with this link.', { status: 404 });
  const file = event.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'event';
  return new Response(eventIcs(event), {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${file}.ics"`, 'cache-control': 'no-store' },
  });
}
