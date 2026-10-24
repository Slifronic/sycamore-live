// What every intake route returns: event details to drop into the New event
// form. Safe to import on the client.
import type { Activity } from './types';
import type { Place } from './place-links';

export type IntakeSource = 'ics' | 'feed' | 'link' | 'text' | 'image' | 'repeat';

export type IntakeDraft = {
  title: string;
  date: string | null; // YYYY-MM-DD, Pacific
  start: string | null; // HH:MM, 24-hour, Pacific
  end: string | null;
  location: string | null; // as written in the source; the form searches it on the map
  place: Place | null; // set when the source had coordinates, or for a repeat
  notes: string | null; // for volunteers: what to bring, parking, where to meet
  goal: string | null;
  activity: Activity | null;
  tags: string[];
  source: IntakeSource;
  source_uid: string | null;
  source_label: string; // "Google Calendar invite", "Pasted text", "Flyer photo"...
  check: string[]; // fields the coordinator should double-check, e.g. ["end"]
  warnings: string[]; // plain sentences shown above the form
};

export type IntakeResult =
  | { kind: 'drafts'; drafts: IntakeDraft[]; note?: string }
  | { kind: 'place'; place: import('./place-links').Place }
  | { kind: 'error'; error: string };

export const SOURCE_LABEL: Record<IntakeSource, string> = {
  ics: 'Calendar invite',
  feed: 'Your calendar',
  link: 'Calendar link',
  text: 'Pasted text',
  image: 'Photo',
  repeat: 'A past event',
};
