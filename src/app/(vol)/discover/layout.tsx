import { currentVolunteer } from '@/lib/vol-data';
import { savedEventIds, upcomingListings } from '@/lib/vol-discover';
import { DiscoverProvider } from './DiscoverState';

// Discover keeps its preferences and role history in page memory across
// /discover, /discover/profile and /discover/<id>, so this layout loads the
// listings and the saved list once and hands them to the client.
// Signed out, each page sends the visitor to /join with its own path as ?next=,
// so joining lands them back on the listing or profile they opened.
export default async function DiscoverLayout({ children }: LayoutProps<'/discover'>) {
  const vol = await currentVolunteer();
  if (!vol) return children;
  const [listings, saved] = await Promise.all([upcomingListings(), savedEventIds(vol.id)]);
  return (
    <DiscoverProvider listings={listings} savedIds={saved}>
      {children}
    </DiscoverProvider>
  );
}

export const instant = false;
