// The built-in onboarding course. Each lesson is about a minute and is
// learn-by-doing: the "Try it" button opens the real screen with a coach bar,
// and the lesson completes itself when the coordinator does the action.
// Nothing to watch, nothing to memorize.

export type LessonKey = 'event_created' | 'checkin_run' | 'event_verified' | 'index_viewed' | 'badge_signed' | 'report_opened';

export type Lesson = {
  key: LessonKey;
  title: string;
  minutes: number;
  why: string;
  steps: string[];
  tip: string;
  href: string; // where "Try it" goes
  coach: string; // one line shown on that screen while the lesson is open
};

export const LESSONS: Lesson[] = [
  {
    key: 'event_created',
    title: 'Create an event',
    minutes: 1,
    why: 'Every hour starts with an event. You can make one 30 seconds before it starts.',
    steps: ['Tap “New event”.', 'Give it a name, a place, a time and one concrete goal, like “Plant 40 trees”.', 'Pick what kind of work it is, so badges count it.'],
    tip: 'Keep using SignUpGenius or whatever you use for sign-ups. SycaMore only needs the day itself.',
    href: '/org/events/new?learn=event_created',
    coach: 'Fill in the name and time, then tap Create. That’s the whole lesson.',
  },
  {
    key: 'checkin_run',
    title: 'Run check-in with a QR code',
    minutes: 1,
    why: 'Volunteers scan once when they arrive and once when they leave. No clipboard, no typing hours.',
    steps: ['Open your event. Tap “Show QR full screen”, or “Print a sign for the table” from the QR card’s menu.', 'Set it at the sign-in table.', 'Watch names appear on the roster as people scan. At the end, “Check out all” closes out anyone still here.'],
    tip: 'No phone? Type their name above the roster and tap Add. Paper sheet at the end? “Import paper sheet” reads it for you.',
    href: '/org/events?learn=checkin_run',
    coach: 'Open your practice event and tap “Practice volunteer” to see the roster fill in.',
  },
  {
    key: 'event_verified',
    title: 'Verify an event in two minutes',
    minutes: 2,
    why: 'Verifying is what turns check-ins into hours a school will accept. It replaces signing hour letters.',
    steps: ['Open the event and tap “Verify”.', 'Set roles with the dropdowns and star anyone who stood out.', 'Answer “did it meet its goal?”, add what got done, and tap Verify & close. Your name goes on every record.'],
    tip: 'Hours fill in from the scans. Only change one if it’s wrong, and say why; the reason prints on the record.',
    href: '/org/events?learn=event_verified',
    coach: 'Pick an event marked “Needs verification” and tap Verify.',
  },
  {
    // The key predates the change (saved progress uses it); the lesson is now
    // about the volunteer list, since the Index is hidden until Phase 4.
    key: 'index_viewed',
    title: 'See who came back',
    minutes: 1,
    why: 'Your volunteer list builds itself from verified events: who came once, regulars, and who hasn’t come in a while.',
    steps: ['Open Volunteers.', 'Switch between Everyone, Came once, Regulars and Away (30+ days).', 'Each row shows verified hours, events and when they last came.'],
    tip: 'You never type anyone in. Every number comes from check-ins and your sign-off.',
    href: '/org/volunteers?learn=index_viewed',
    coach: 'Tap a filter at the top to see each group.',
  },
  {
    key: 'badge_signed',
    title: 'Sign off a badge',
    minutes: 1,
    why: 'A badge records that a volunteer met a rule in your verified hours and roles. It only counts once you sign it.',
    steps: ['Open Badges.', 'Check who is ready for your sign-off.', 'Add a short note when the badge asks for one, then sign.'],
    tip: 'The “Almost there” list is a great reason to invite someone back.',
    href: '/org/badges?learn=badge_signed',
    coach: 'Sign one badge from the “Ready for your sign-off” list.',
  },
  {
    key: 'report_opened',
    title: 'Send your funder report',
    minutes: 1,
    why: 'Grant reports ask for hours, volunteers and the dollar value of their time. It’s one click now.',
    steps: ['Open Reports.', 'Pick the period your grant covers.', 'Print or save it as a PDF, or download the CSV.'],
    tip: 'Schools: the CSV has every student’s verified hours for the counselor.',
    href: '/org/reports?learn=report_opened',
    coach: 'Choose a period and tap “Save as PDF”.',
  },
];

export const lessonByKey = Object.fromEntries(LESSONS.map((l) => [l.key, l])) as Record<LessonKey, Lesson>;

export const COURSE_MINUTES = LESSONS.reduce((n, l) => n + l.minutes, 0);

export function courseProgress(flags: Record<string, string>) {
  const done = LESSONS.filter((l) => flags[l.key]);
  const next = LESSONS.find((l) => !flags[l.key]) ?? null;
  const minutesLeft = COURSE_MINUTES - done.reduce((n, l) => n + l.minutes, 0);
  return { done: done.length, total: LESSONS.length, next, complete: !next, minutesLeft };
}
