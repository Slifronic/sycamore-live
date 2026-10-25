import type { IconName } from './icons';

// The coordinator side's map, shared by the rail, the phone tab bar, the
// command palette and the top bar's sub-view switcher. Add a page here and it
// shows up in all of them.

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean; count?: 'awaiting' | 'unread' | 'badges' };

/** The rail, top to bottom. */
export const RAIL: NavItem[] = [
  { href: '/org', label: 'Home', icon: 'home', exact: true },
  { href: '/org/events', label: 'Events', icon: 'calendar', count: 'awaiting' },
  { href: '/org/volunteers', label: 'Volunteers', icon: 'users' },
  { href: '/org/messages', label: 'Messages', icon: 'message', count: 'unread' },
  { href: '/org/reports', label: 'Reports', icon: 'report' },
];

/** Rarely used pages, under "More". */
export const MORE: NavItem[] = [
  { href: '/org/badges', label: 'Badges', icon: 'award', count: 'badges' },
  { href: '/org/learn', label: 'Learn', icon: 'book' },
];

/** Phones: four tabs plus More (Reports moves into More). */
export const TABS: NavItem[] = RAIL.slice(0, 4);
export const TAB_MORE: NavItem[] = [RAIL[4], ...MORE];

export const isActive = (path: string, it: { href: string; exact?: boolean }) =>
  it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`);

/**
 * Sub-views shown as a pill switcher in the top bar, per section. `show`
 * decides on which paths the switcher appears (list-level pages, not detail
 * pages). A page with its own controls can instead fill the slot with
 * <TopBarSlot> (shell/TopBarSlot.tsx).
 */
export type SectionViews = { id: string; label: string; show: (path: string) => boolean; items: { href: string; label: string; match: (path: string) => boolean; count?: 'unread' | 'chatUnread' }[] };

export const SECTION_VIEWS: SectionViews[] = [
  {
    id: 'events-views',
    label: 'Events views',
    show: (p) => p === '/org/events' || p === '/org/events/calendar',
    items: [
      { href: '/org/events', label: 'List', match: (p) => p === '/org/events' },
      { href: '/org/events/calendar', label: 'Calendar', match: (p) => p === '/org/events/calendar' },
    ],
  },
  {
    id: 'messages-views',
    label: 'Messages sections',
    show: (p) => p === '/org/messages' || p.startsWith('/org/messages/'),
    items: [
      { href: '/org/messages', label: 'Inbox', match: (p) => p === '/org/messages', count: 'unread' },
      { href: '/org/messages/events', label: 'Event chats', match: (p) => p.startsWith('/org/messages/events'), count: 'chatUnread' },
      { href: '/org/messages/broadcasts', label: 'Broadcasts', match: (p) => p.startsWith('/org/messages/broadcasts') },
      { href: '/org/messages/automations', label: 'Automations', match: (p) => p.startsWith('/org/messages/automations') },
    ],
  },
];

/** Every page the command palette can jump to. */
export const PAGES: { href: string; label: string; icon: IconName; keywords?: string }[] = [
  ...RAIL.map((r) => ({ href: r.href, label: r.label, icon: r.icon, keywords: r.href === '/org/reports' ? 'funder report grant export csv' : undefined })),
  { href: '/org/events/calendar', label: 'Calendar', icon: 'calendar', keywords: 'events month' },
  { href: '/org/messages/events', label: 'Event chats', icon: 'message', keywords: 'messages chat' },
  { href: '/org/messages/broadcasts', label: 'Broadcasts', icon: 'megaphone', keywords: 'messages send all' },
  { href: '/org/messages/automations', label: 'Automations', icon: 'route', keywords: 'messages flows' },
  ...MORE.map((r) => ({ href: r.href, label: r.label, icon: r.icon, keywords: r.href === '/org/learn' ? 'course lessons help getting started' : 'awards sign' })),
];
