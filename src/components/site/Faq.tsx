import Link from 'next/link';
import type { ReactNode } from 'react';
import f from './faq.module.css';

// The questions people actually ask, in one place: the home page shows the
// first five, /faq shows them all. Native <details>, so it works without
// JavaScript and with the keyboard.

export type QA = { id: string; q: string; a: ReactNode; home?: boolean };

export const FAQ: QA[] = [
  {
    id: 'free',
    home: true,
    q: 'Is it free for volunteers?',
    a: <p>Yes, always. Check-in, hours, share links, badges and Discover cost volunteers nothing. Nobody is charged during the demo.</p>,
  },
  {
    id: 'app',
    home: true,
    q: 'Do volunteers need an app?',
    a: <p>No. Check-in is a web page: scan the event’s QR code with the phone camera, or type the 6-character code.</p>,
  },
  {
    id: 'forgot',
    home: true,
    q: 'What if someone forgets to check out?',
    a: <p>At verify, one tap counts them to the end of the event. Their record prints the reason, so nobody mistakes it for a scanned time.</p>,
  },
  {
    id: 'inflate',
    home: true,
    q: 'Can a coordinator inflate hours?',
    a: <p>Every change needs a reason, and the record shows captured hours next to adjusted ones. Shifts over 8 hours are flagged. Verified rows are read-only.</p>,
  },
  {
    id: 'schools',
    home: true,
    q: 'What does a school see?',
    a: (
      <p>
        A public page: VERIFIED or REVOKED, the organization’s statement, captured and adjusted hours, and who to contact. No login, and search engines
        are asked not to index it. <Link href="/trust">How to read a record</Link>
      </p>
    ),
  },
  {
    id: 'edit',
    q: 'Can a volunteer edit their own hours?',
    a: <p>No. Hours come from the scans and the coordinator’s verification. The volunteer’s browser never sends an hour number.</p>,
  },
  {
    id: 'minors',
    q: 'What about minors?',
    a: (
      <p>
        Under 13 can’t join, and nothing is stored. Ages 13 to 17 confirm a guardian knows, keep their hours, and need a guardian’s OK to share. Under
        18 gets announcements only. <Link href="/privacy#minors">Privacy for minors</Link>
      </p>
    ),
  },
  {
    id: 'ai',
    q: 'Does the AI decide anything?',
    a: (
      <p>
        No. Claude drafts sheet rows, event forms and wording. Nothing from a sheet saves until a coordinator confirms each row, it never invents a
        check-out time, and only a coordinator verifies hours.
      </p>
    ),
  },
  {
    id: 'after',
    q: 'What happens after an event is verified?',
    a: <p>The rows lock and each volunteer’s hours move from “waiting” to their record. If something was wrong, the organization revokes it, and its link says REVOKED.</p>,
  },
  {
    id: 'location',
    q: 'Does it track where volunteers are?',
    a: <p>Only if both sides opt in. Even then no coordinates are stored: only when someone left the area and roughly how far. Verifying the event wipes it.</p>,
  },
  {
    id: 'messages',
    q: 'Will organizations send me marketing?',
    a: <p>Only if you opt in: announcements stay off until you turn them on in Account. Event-day notes, like where to meet, still reach you. SycaMore Live sends no marketing email.</p>,
  },
  {
    id: 'data',
    q: 'Can I download or delete my data?',
    a: (
      <p>
        Yes, from Account. Download gives you a file of everything held about you. Delete removes your account; organizations keep verified totals with
        no name attached. <Link href="/data">Your data</Link>
      </p>
    ),
  },
  {
    id: 'signup',
    q: 'Can we keep our sign-up tool?',
    a: <p>Yes. SycaMore Live starts at the sign-in table, not at sign-up. Paste your event’s link into a new event and the form fills itself.</p>,
  },
  {
    id: 'paper',
    q: 'Can we bring in old paper sheets?',
    a: <p>Yes. Photograph the sheet; Claude drafts the rows and marks unsure ones amber. Nothing saves until you confirm each row. Synthetic test sheets: 19 of 19 rows right. Real handwriting is untested.</p>,
  },
  {
    id: 'company',
    q: 'Is this a real company?',
    a: (
      <p>
        No, it’s a student project started at Cal Hacks 13.0 in October 2026, running as a demo. <Link href="/about">About the team</Link>
      </p>
    ),
  },
];

export function FaqList({ items, openFirst = true }: { items: QA[]; openFirst?: boolean }) {
  return (
    <div className={f.list}>
      {items.map((item, i) => (
        <details key={item.id} id={item.id} className={f.item} name="faq" open={openFirst && i === 0}>
          <summary className={f.q}>
            <span>{item.q}</span>
            <span className={f.icon} aria-hidden="true" />
          </summary>
          <div className={f.a}>{item.a}</div>
        </details>
      ))}
    </div>
  );
}
