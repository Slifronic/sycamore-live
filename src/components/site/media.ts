// Every image the marketing site uses, in one place. Photos and illustrations
// are AI-generated (the footer says so). Product screens are captured from the
// running app into /media/screens; until they exist the device frames draw a
// quiet placeholder of the right shape (flip SCREENS_READY when they land).

export const photo = (name: PhotoName, small = false) => `/media/photo/${name}${small ? '-sm' : ''}.webp`;
export const illo = (name: IlloName) => `/media/illo/${name}.webp`;

export type PhotoName =
  | 'hero-creek'
  | 'hero-creek-portrait'
  | 'before-clipboard'
  | 'cover-planting'
  | 'cover-food'
  | 'cover-cleanup'
  | 'cover-tutoring'
  | 'cover-shelter'
  | 'audience-coordinator'
  | 'audience-volunteer'
  | 'audience-school';

export type IlloName = 'sapling' | 'ledger' | 'envelope' | 'compass' | 'seed-pod' | 'leaf-badge';

export type ScreenName =
  | 'org-dashboard'
  | 'event-day'
  | 'verify'
  | 'sheet-import'
  | 'record-public'
  | 'me-phone'
  | 'checkin-phone'
  | 'hour-letter';

export const SCREENS_READY = false;

export const screen = (name: ScreenName): string | undefined => (SCREENS_READY ? `/media/screens/${name}.webp` : undefined);

/** The one shared record the hero card and "See a verified record" fall back to. */
export const DEMO_RECORD_CODE = 'SYC-RVR7-PLNT';
