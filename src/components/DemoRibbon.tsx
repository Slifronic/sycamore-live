import { isDemo } from '@/lib/demo';

// A slim strip at the very top of org and volunteer pages so nobody mistakes
// the seed for real people. In the page flow (not fixed), so it never covers anything.
export function DemoRibbon() {
  if (!isDemo()) return null;
  return (
    <p className="demo-ribbon no-print" role="note">
      Demo data · made-up names
    </p>
  );
}
