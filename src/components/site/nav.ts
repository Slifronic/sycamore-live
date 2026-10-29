// The marketing site's pages, in the order the header and footer list them.

export const NAV = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/organizations', label: 'Organizations' },
  { href: '/volunteers', label: 'Volunteers' },
  { href: '/trust', label: 'Trust' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
] as const;

export const MORE = [{ href: '/about', label: 'About' }] as const;

export const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      { href: '/how-it-works', label: 'How it works' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/trust', label: 'Trust & the record' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'For you',
    links: [
      { href: '/organizations', label: 'Organizations' },
      { href: '/volunteers', label: 'Volunteers' },
      { href: '/discover', label: 'Discover events' },
      { href: '/about', label: 'About the team' },
    ],
  },
  {
    title: 'Get going',
    links: [
      { href: '/org/start', label: 'Set up your organization' },
      { href: '/signin', label: 'Sign in' },
      { href: '/join', label: 'Join as a volunteer' },
      { href: '/checkin', label: 'Check in at an event' },
    ],
  },
] as const;

/** Longest matching href wins (spotlight.md's active-pill rule). */
export function activeHref(path: string, hrefs: readonly string[]) {
  return hrefs
    .filter((h) => path === h || path.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length)[0];
}
