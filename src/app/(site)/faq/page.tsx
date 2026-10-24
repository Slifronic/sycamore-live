import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CtaBand, PageHero, siteStyles as ss } from '@/components/site/Blocks';
import { Reveal } from '@/components/site/Reveal';
import f from '@/components/site/faq.module.css';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Straight answers about SycaMore Live: cost for volunteers, forgotten check-outs, inflated hours, what schools see, minors, AI, what happens after verification and keeping your sign-up tool.',
};

const QA: { q: string; a: ReactNode }[] = [
  {
    q: 'Is it free for volunteers?',
    a: <p>Yes, always. Checking in, My hours, share links, badges and Discover cost volunteers nothing. Organizations pay on the planned paid plans, and nothing is charged during the hackathon demo.</p>,
  },
  {
    q: 'Do volunteers need to install an app?',
    a: <p>No. Check-in is a web page: scan the event’s QR code with the phone’s camera, or type the 6-character code.</p>,
  },
  {
    q: 'What if a volunteer forgets to check out?',
    a: (
      <p>
        When the coordinator verifies, one tap fills in everyone who didn’t scan out, counted until the event ended. Their record prints the reason,
        so nobody mistakes it for a scanned time. The coordinator can change it, with a reason, if they know better.
      </p>
    ),
  },
  {
    q: 'Can a coordinator inflate hours?',
    a: (
      <p>
        A coordinator can change hours before verifying, but every change needs a reason, and the record shows the captured hours from the scans next
        to the adjusted hours, with the coordinator’s name and reason. Shifts over 8 hours are flagged. After verifying, the rows are read-only.
      </p>
    ),
  },
  {
    q: 'Can a volunteer edit their own hours?',
    a: <p>No. Hours come from check-in and check-out scans and the coordinator’s verification. The volunteer’s browser never sends an hour number.</p>,
  },
  {
    q: 'What do schools and scholarship committees see?',
    a: (
      <p>
        The share link opens a public page: VERIFIED or REVOKED, the organization’s statement (who served, as what, where, when, for how many hours,
        captured and adjusted), and the organization’s phone and email. No login, and it isn’t indexed by search engines. The volunteer can also hand
        over a printed hour letter. <Link href="/trust">How to read a record</Link>.
      </p>
    ),
  },
  {
    q: 'What about minors?',
    a: (
      <p>
        Under 13 can’t join, and nothing is stored. Ages 13 to 17 keep their hours, but sharing a record needs a guardian’s OK. Volunteers under 18
        get announcements only: no event group chats and no direct messages with coordinators.
      </p>
    ),
  },
  {
    q: 'Does the AI decide anything?',
    a: (
      <p>
        No. Claude drafts rows from a photo of a paper sheet, fills event forms from pasted material, and drafts wording. Nothing from a sheet saves
        until a coordinator confirms each row, it never invents a check-out time, and only a coordinator can verify hours or sign a badge.
      </p>
    ),
  },
  {
    q: 'What happens after an event is verified?',
    a: (
      <p>
        The attested rows become read-only, each volunteer’s hours move from “waiting” to their record, and they can share it. If something was
        wrong, the organization can revoke a record; its link then says REVOKED. It is never quietly edited.
      </p>
    ),
  },
  {
    q: 'Does SycaMore Live track where volunteers are?',
    a: (
      <p>
        Only if both sides opt in. The leave-the-area check is off for every event and every volunteer by default. When it’s on, only when someone
        left the area and roughly how far is kept, not coordinates, and verifying the event wipes it.
      </p>
    ),
  },
  {
    q: 'Can I keep using SignUpGenius?',
    a: (
      <p>
        Yes. SycaMore Live doesn’t do sign-ups; it starts at the sign-in table. Paste your event’s link or announcement into a new event and the form
        fills itself, then share the event’s public page alongside your usual sign-up.
      </p>
    ),
  },
  {
    q: 'We still have paper sheets from past events. Can we bring them in?',
    a: (
      <p>
        Yes: photograph the sheet and Claude drafts the rows, with unsure rows in amber. Nothing is saved until you confirm each one. On synthetic
        test sheets it got 19 of 19 rows right before review; a test on real handwriting is still pending.
      </p>
    ),
  },
  {
    q: 'Is SycaMore Live a real company?',
    a: (
      <p>
        It’s a student project, started at Cal Hacks 13.0 in October 2026, by part of the team behind SycaMore. <Link href="/about">About the team</Link>.
      </p>
    ),
  },
];

export default function Faq() {
  return (
    <>
      <PageHero eyebrow="FAQ" title={['Questions,', <em key="e">answered plainly.</em>]} lede="If something here isn’t clear, the honest answer is probably in How it works or Trust." />
      <section className={ss.section} style={{ paddingTop: 0 }} aria-label="Questions and answers">
        <Reveal className={`${ss.narrow} ${f.list}`}>
          {QA.map((item, i) => (
            <details key={item.q} className={f.item} name="faq" open={i === 0}>
              <summary className={f.q}>
                <span>{item.q}</span>
                <span className={f.icon} aria-hidden="true" />
              </summary>
              <div className={f.a}>{item.a}</div>
            </details>
          ))}
        </Reveal>
      </section>
      <CtaBand />
    </>
  );
}
