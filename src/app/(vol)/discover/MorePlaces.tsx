import { connection } from 'next/server';
import { requestNow } from '@/lib/format';
import { CATEGORY_LABEL, cityKey, listedOpportunities } from '@/lib/opportunities';
import { MorePlacesList, type PlaceCard } from './MorePlacesList';

// Under Discover's ranked events: a few public listings from organizations
// that mostly don't use SycaMore, and a link to the whole board. The server
// sends every listing's public fields and the day's three picks (the same for
// everyone); MorePlacesList puts skill matches first in the browser, so
// nothing about the volunteer (preferences, role text, saved list) is sent.
export async function MorePlaces() {
  await connection(); // the day's three picks are chosen per request
  const all = await listedOpportunities();
  if (!all.length) return null;
  const day = Math.floor(requestNow() / 86_400_000);
  const step = Math.max(1, Math.floor(all.length / 3));
  const picks = [0, 1, 2].map((i) => all[(day + i * step) % all.length]!.slug).filter((o, i, a) => a.indexOf(o) === i);
  const cards: PlaceCard[] = all.map((o) => ({
    slug: o.slug,
    title: o.title,
    org_name: o.org_name,
    where: o.remote && cityKey(o.city) === 'remote' ? 'From home' : o.city,
    category: CATEGORY_LABEL[o.category],
    skills: o.skills ?? [],
  }));
  return <MorePlacesList all={cards} picks={picks} total={all.length} />;
}
