import { redirect } from 'next/navigation';
import { safeOrgNext } from '@/lib/session';

// Coordinator sign-in moved to /signin?as=org (Google, with the PIN beneath it).
// Old links and bookmarks still land in the right place.
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<'/org/login'>) {
  const next = safeOrgNext((await searchParams).next);
  redirect(next === '/org' ? '/signin?as=org' : `/signin?as=org&next=${encodeURIComponent(next)}`);
}
