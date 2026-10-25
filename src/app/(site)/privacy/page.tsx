import Link from 'next/link';
import { Contact, DataTable, LegalPage, type LegalSection } from '@/components/site/Legal';
import { pageMeta } from '@/components/site/meta';

export const metadata = pageMeta(
  'Privacy policy',
  'What SycaMore Live collects and why, who else sees it (including Anthropic and OpenAI for AI drafts), how minors are protected, and your rights.',
  '/privacy',
);

const SECTIONS: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          SycaMore Live is a student project, started at Cal Hacks 13.0 in October 2026 and running as a demo. It records volunteer hours at events:
          volunteers check in and out, the organization that ran the event confirms the hours, and each volunteer gets a record anyone with the link can
          check.
        </p>
        <p>
          Two kinds of people use it. <strong>Organizations</strong> (a coordinator signs in with a PIN) create events and confirm hours.{' '}
          <strong>Volunteers</strong> join, check in, and keep their records. An organization decides what goes on its records; we run the tool.
        </p>
        <p>
          While this is a demo, please don’t put anything in it you’d need to keep private. The demo data you see on this site uses made-up names.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect, and why',
    body: (
      <>
        <p>Only what the service needs to work. Here is all of it.</p>
        <h3>Volunteers</h3>
        <DataTable
          head={['What', 'Why']}
          rows={[
            ['Name, email and birth date', 'To make your account, put your name on your records, and apply the age rules (under 13 can’t join; 13 to 17 have extra protections).'],
            ['Your Google account ID, if you sign up with Google', 'So “Continue with Google” signs you back in. We get your name and verified email from Google, nothing else.'],
            ['Check-in and check-out times, and how you checked in', 'These are your hours. They’re timed on our server, not typed by you.'],
            [
              'What the coordinator adds when confirming: your role, any changed hours with the reason, a “standout” star',
              'This is the organization’s statement about your service. A changed hour always carries its reason.',
            ],
            [
              'The leave-the-area signal, only if you and the event both turned it on',
              'When you were first seen outside the event’s area and roughly how far away. No coordinates are stored, and it’s deleted when the event is verified.',
            ],
            ['Records, share links and badges', 'So you can share a record and anyone with the link can check it.'],
            ['Messages and event chat posts, and when they were read', 'So organizations and volunteers can talk. Volunteers under 18 only get announcements.'],
            ['Events you save, your personal hours goal', 'Features you chose to use.'],
            ['When you accepted the Terms, and whether you opted in to announcements', 'To keep a record of your consent. Announcements are off until you turn them on.'],
          ]}
        />
        <p>
          Text you paste into Discover’s profile box stays in your browser’s memory. It is never sent to us or stored.
        </p>
        <h3>Organizations and coordinators</h3>
        <DataTable
          head={['What', 'Why']}
          rows={[
            ['Organization name, type and city; coordinator name, phone and email; the PIN', 'To sign you in, and so volunteers and record readers know who to contact. The contact details appear on records and event pages.'],
            ['Events: title, time, place and notes', 'To run the event. Each event has a public page; the check-in code is not on it.'],
            ['Photos of paper sign-in sheets', 'Sent to Anthropic to draft rows for you to confirm. We don’t keep the photo.'],
            [
              'Event story: voice debriefs, their transcript, video clips and still frames',
              'To draft a story about the event. Voice notes stay private. Clips you mark as consented can appear on a published story page.',
            ],
          ]}
        />
        <h3>Everyone</h3>
        <ul>
          <li>
            <strong>Cookies.</strong> Essential only. <code>vid</code> keeps a volunteer signed in (1 year), <code>oid</code> keeps a coordinator signed in
            (30 days), and <code>sm-hide-lesson</code> remembers that a coordinator hid a tip. Your light or dark theme is saved in your browser’s local
            storage. No analytics, advertising or tracking cookies.
          </li>
          <li>
            <strong>Server logs.</strong> Our host keeps short-lived request logs (IP address, page, time) to run and secure the service.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'basis',
    title: 'Our legal basis',
    body: (
      <>
        <p>Where privacy law asks us to name a reason for using your data, these are ours:</p>
        <ul>
          <li>
            <strong>To provide the service you signed up for</strong>: your account, check-ins, hours, records and messages.
          </li>
          <li>
            <strong>Legitimate interests</strong>: the organization’s need to keep an accurate record of who served, and our need to keep the service secure.
          </li>
          <li>
            <strong>Consent</strong>: announcements from organizations, the leave-the-area check, signing up with Google, and sharing a record. You can
            withdraw any of these at any time, and it stops from then on.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'minors',
    title: 'Minors',
    body: (
      <>
        <p>Many volunteers are teenagers, so the rules for minors are built into the data layer, not just the screens.</p>
        <ul>
          <li>
            <strong>Under 13 can’t join.</strong> Sign-up refuses, and nothing is stored, online or at an event’s door.
          </li>
          <li>
            <strong>Ages 13 to 17</strong> can join and keep their hours, and must confirm that a parent or guardian knows they’re using SycaMore Live.
            Sharing a record needs a guardian’s OK; until then the server refuses.
          </li>
          <li>
            <strong>Messages:</strong> under 18 gets the organization’s announcements only. No event group chats, and no direct messages with
            coordinators in either direction.
          </li>
          <li>
            <strong>Event stories:</strong> Claude flags video frames where people, possibly minors, can be recognized, and only clips the coordinator
            marks as consented can be published.
          </li>
        </ul>
        <p>A parent or guardian can ask us to see, correct or delete a minor’s data. See “Contact”.</p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Who else sees your data',
    body: (
      <>
        <p>We don’t sell your data or share it for advertising. These services handle some of it so the app can work:</p>
        <DataTable
          head={['Service', 'What it receives', 'When']}
          rows={[
            [
              'Anthropic (Claude)',
              'Photos of paper sign-in sheets; pasted event text, links’ content or flyer photos; event story transcripts, video still frames and the event’s verified facts; facts for a broadcast draft; a record’s facts for “Use this record” when OpenAI isn’t set up.',
              'Only when a coordinator or volunteer uses one of those features.',
            ],
            [
              'OpenAI',
              'A record’s facts (organization, event, date, role, hours) to draft a resume line or scholarship sentence. Nothing you typed.',
              'Only when “Use this record” is used and the app is set up to use OpenAI.',
            ],
            ['Vercel', 'Every request, as our web host.', 'Always.'],
            ['Neon', 'The database, as our database host.', 'Always.'],
            ['Google', 'Your sign-in, to confirm who you are.', 'Only if you choose “Continue with Google”.'],
            [
              'Your browser’s speech service',
              'A coordinator’s voice debrief, to show a live transcript. In Chrome this audio goes to Google.',
              'Only while a coordinator records a debrief.',
            ],
            ['OpenStreetMap', 'Place searches typed by a coordinator; the map on an event page loads from OpenStreetMap.', 'When searching for a place, or viewing an event page with a map.'],
          ]}
        />
        <p>
          We use these providers’ paid APIs, not their consumer apps. Their own terms govern how long they keep what we send. AI output is always a draft:
          a person confirms it before it counts.
        </p>
        <p>
          <strong>Public by design.</strong> A shared record’s link, a badge’s link, an event page and a published story page can be opened by anyone with
          the link. They ask search engines not to index them. The check-in code and your email and birth date never appear on them.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <>
        <ul>
          <li>
            <strong>Your account and records:</strong> until you delete your account, or until the demo database is reset, whichever is first.
          </li>
          <li>
            <strong>Leave-the-area signal:</strong> deleted when the event is verified.
          </li>
          <li>
            <strong>Sheet photos:</strong> not kept; only the rows the coordinator confirms are saved.
          </li>
          <li>
            <strong>Voice notes and clips:</strong> until the coordinator deletes them.
          </li>
          <li>
            <strong>Cookies:</strong> 1 year (volunteers) or 30 days (coordinators), or until you sign out.
          </li>
        </ul>
        <p>
          Details, and what deletion keeps, are on <Link href="/data">Your data</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Keeping it safe',
    body: (
      <>
        <p>
          Every connection is encrypted (HTTPS). Sign-in cookies can’t be read by page scripts. Verified hours are locked by a database rule, so nobody
          can quietly edit them later. Pasted links are only fetched from public addresses, and text inside sheets and pasted material is treated as data,
          never as instructions.
        </p>
        <p>
          To be straight with you: sign-in is <strong>demo-grade</strong>. Coordinators use a PIN and volunteers are recognized by a cookie. Real sign-in is
          planned before anyone relies on this outside a demo. We haven’t had a security audit and don’t claim any certification.
        </p>
        <p>
          If something goes wrong, our breach steps are on <Link href="/data#breach">Your data</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>Wherever you live, you can:</p>
        <ul>
          <li>
            <strong>See and download</strong> everything about you: <Link href="/me/account">Account → Download my data</Link> gives you a JSON file.
          </li>
          <li>
            <strong>Delete</strong> your account: <Link href="/me/account">Account → Delete my account</Link>.
          </li>
          <li>
            <strong>Correct</strong> your name or email: ask the organization or us. Hours are corrected by the organization that confirmed them.
          </li>
          <li>
            <strong>Withdraw consent</strong> for announcements or the leave-the-area check, at any time.
          </li>
          <li>
            <strong>Complain</strong> to your local data protection authority if you think we got something wrong.
          </li>
        </ul>
        <p>We don’t sell or share personal information for advertising, so there’s nothing to opt out of there.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change what we collect or who we share it with, we’ll update this page and the date at the top, and tell signed-in users in the app before
        the change applies to them.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        For any privacy question or request: <Contact />
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      lede="What we collect, why, and who else sees it. Written plainly, for volunteers, parents and coordinators."
      summary={[
        'We collect what the service needs: your name, email and birth date, your check-in times, and what you choose to add.',
        'Under 13 can’t join. Ages 13 to 17 need a guardian’s OK to share a record, and don’t get direct messages.',
        'No coordinates are ever stored. The optional leave-the-area check keeps only a time, and it’s deleted at verify.',
        'Some features send data to Anthropic or OpenAI to draft text. A person confirms every draft.',
        'No ads, no tracking, no selling data. You can download or delete your data any time.',
      ]}
      sections={SECTIONS}
      related={[
        { href: '/terms', label: 'Terms of use' },
        { href: '/data', label: 'Your data' },
        { href: '/trust', label: 'How the record works' },
      ]}
    />
  );
}
