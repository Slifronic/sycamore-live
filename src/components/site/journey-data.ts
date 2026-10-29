import type { RecordView } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/types';
import { fmtHours } from '@/lib/hours';
import { DEMO_RECORD_CODE } from './media';

// The facts the volunteer journey is drawn from. They come from the real,
// shared demo record (featured-record.ts) when the database answers, and fall
// back to the same made-up seed values when it doesn't. Plain strings only, so
// they can cross into the client components.

export type JourneyFacts = {
  volunteer: string;
  first: string;
  org: string;
  coordinator: string;
  event: string;
  place: string;
  /** "Sun, Sep 20" */
  day: string;
  /** "Sep 20, 2026" */
  dateLong: string;
  role: string;
  hours: string;
  code: string;
  /** "Sep 23, 2026" */
  attested: string;
  phone: string;
  href: string;
};

const dayOf = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
const longOf = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
const pacific = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' });

export function journeyFacts(r: RecordView | null): JourneyFacts {
  const volunteer = r?.volunteer_name ?? 'Ana Reyes';
  return {
    volunteer,
    first: volunteer.split(' ')[0],
    org: r?.org.name ?? 'Riverside Restoration Crew',
    coordinator: 'Sam',
    event: r?.event.title ?? 'Santa Teresa Planting, Phase 1',
    place: r?.event.location ?? 'Santa Teresa County Park',
    day: dayOf(r?.event.date ?? '2026-09-20'),
    dateLong: longOf(r?.event.date ?? '2026-09-20'),
    role: r ? ROLE_LABEL[r.role] : 'Team lead',
    hours: r ? fmtHours(r.hours_total) : '3',
    code: r?.code ?? DEMO_RECORD_CODE,
    attested: r ? pacific(r.attested_at) : 'Sep 23, 2026',
    phone: r?.org.contact_phone ?? '(408) 555-0142',
    href: r?.code ? `/v/${r.code}` : '/trust',
  };
}

/** Ana's other verified records in the demo seed (made-up names), for "months of showing up". */
export const SEASON = [
  { title: 'Berryessa Creek Planting', org: 'Riverside Restoration Crew', day: 'Sep 6', hours: '3' },
  { title: 'Saturday Reading Buddies', org: 'Eastside Learning Circle', day: 'Sep 12', hours: '2' },
  { title: 'Fall Food Drive Sort', org: 'Northside Neighbors Pantry', day: 'Sep 26', hours: '3.5' },
  { title: 'Pantry Sort Night', org: 'Riverside Restoration Crew', day: 'Oct 5', hours: '3' },
  { title: 'Homework Help Night', org: 'Eastside Learning Circle', day: 'Oct 7', hours: '2' },
] as const;

export type JourneyStep = {
  id: string;
  short: string;
  title: string;
  text: (f: JourneyFacts) => string;
  /** The home page's one-line version (8 words or fewer), shown under `short`. */
  caption: (f: JourneyFacts) => string;
  note?: (f: JourneyFacts) => string;
  device: 'phone' | 'window';
};

export const JOURNEY: JourneyStep[] = [
  {
    id: 'find',
    short: 'Find',
    title: 'She finds an event.',
    text: (f) => `${f.first} finds ${f.event} on Discover, or gets the link in a group chat, and adds it to her calendar. No app to install.`,
    caption: () => 'Found on Discover. No app to install.',
    device: 'phone',
  },
  {
    id: 'scan-in',
    short: 'Scan in',
    title: 'She scans in at the table.',
    text: () => 'Her phone camera reads the event’s QR code. First time here? She joins in one step and lands straight back on check-in.',
    note: () => 'Check-in opens 2 hours before the start and closes 2 hours after the end.',
    caption: () => 'Her phone camera reads the table’s QR code.',
    device: 'phone',
  },
  {
    id: 'shift',
    short: 'Serve',
    title: 'She works the shift.',
    text: () => 'Her phone shows a running timer. Nothing to write down: the server times it from her own scans.',
    caption: () => 'The server times it. Nothing to type.',
    device: 'phone',
  },
  {
    id: 'scan-out',
    short: 'Scan out',
    title: 'She scans out.',
    text: (f) => `Until ${f.org} confirms, the event shows as waiting, with no number. Forgot to scan out? The coordinator fills it in, and the reason is printed.`,
    caption: () => 'Hours wait, with no number, until confirmed.',
    device: 'phone',
  },
  {
    id: 'verify',
    short: 'Verify',
    title: 'The coordinator verifies.',
    text: (f) => `${f.coordinator}, the coordinator, closes the event. Hours arrive pre-filled from the scans, every changed hour needs a reason, and Verify & close locks the rows.`,
    note: () => 'About two minutes for a whole event.',
    caption: (f) => `${f.coordinator} confirms. Changes need reasons. Rows lock.`,
    device: 'window',
  },
  {
    id: 'record',
    short: 'Record',
    title: 'Her record appears.',
    text: () => 'It has its own link. Anyone who opens it sees VERIFIED, who vouches for it, and how the hours were captured. No account needed.',
    note: () => 'Under 18? Sharing waits for a guardian’s OK.',
    caption: () => 'Its own link, VERIFIED. No account to check.',
    device: 'phone',
  },
  {
    id: 'apply',
    short: 'Apply',
    title: 'It goes on the application.',
    text: () =>
      'One record is a morning. A season of them is months of showing up, each one checkable. She pastes the links into a scholarship application, and the committee opens them itself.',
    caption: () => 'She pastes the links into a scholarship application.',
    device: 'window',
  },
];
