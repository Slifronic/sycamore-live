import { requireVolunteer } from '@/lib/vol-data';
import { ProfileView } from './ProfileView';

export const metadata = {
  title: 'Your Discover profile',
  description: 'Tell Discover what you’ve done and what you want to try. Pasted text stays on this page; nothing is sent or stored.',
};

export default async function DiscoverProfilePage() {
  await requireVolunteer('/discover/profile');
  return <ProfileView />;
}

// Reads the volunteer cookie to send a signed-out visitor to /join with this path.
export const instant = false;
