import { requireVolunteer } from '@/lib/vol-data';
import { DiscoverHome } from './DiscoverHome';
import { MorePlaces } from './MorePlaces';

export const metadata = {
  title: 'Discover',
  description: 'Upcoming public events from every organization, ranked in your browser by what you want to do.',
};

// Contract-free volunteer addition: recommendations from real upcoming events.
// Everything renders from the layout's data; see DiscoverState.tsx.
export default async function DiscoverPage() {
  await requireVolunteer('/discover');
  return (
    <>
      <DiscoverHome />
      <MorePlaces />
    </>
  );
}

// Reads the volunteer cookie to send a signed-out visitor to /join with this path.
export const instant = false;
