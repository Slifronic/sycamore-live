import { NextResponse } from 'next/server';
import { currentOrg } from '@/lib/session';
import { placeFromText, searchPlaces } from '@/lib/places';
import { FetchBlocked } from '@/lib/safe-fetch';

// Org addition: the place picker.
// GET ?q=… searches OpenStreetMap; ?q= a maps link or "lat, lng" resolves it to one pin.
export async function GET(req: Request) {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 500);
  if (q.length < 3) return NextResponse.json({ places: [] });
  try {
    const one = await placeFromText(q);
    if (one) return NextResponse.json({ places: [one], resolved: true });
    return NextResponse.json({ places: await searchPlaces(q) });
  } catch (e) {
    if (e instanceof FetchBlocked) return NextResponse.json({ error: e.message, places: [] }, { status: 422 });
    return NextResponse.json({ error: 'Map search isn’t reachable right now. Type the address; you can pick the pin later.', places: [] }, { status: 502 });
  }
}
