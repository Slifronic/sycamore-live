import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { DetailView } from './DetailView';

export const metadata = { title: 'Event details' };

// One listing, by the event's public slug. A slug that isn't an upcoming
// public event is a 404 (the listings themselves come from the layout).
export default async function DiscoverDetailPage({ params }: PageProps<'/discover/[id]'>) {
  const { id } = await params;
  if (!/^[0-9a-f]{10}$/.test(id)) notFound();
  const [row] = (await sql`
    select id from event where public_slug = ${id} and not is_practice and attested_at is null and status = 'open' and ends_at > now()`) as unknown as { id: string }[];
  if (!row) notFound();
  return <DetailView eventId={row.id} />;
}

export const instant = false;
