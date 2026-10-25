import Link from 'next/link';
import { Contact, DataTable, LegalPage, type LegalSection } from '@/components/site/Legal';
import { pageMeta } from '@/components/site/meta';

export const metadata = pageMeta(
  'Your data',
  'Download or delete your SycaMore Live data, what deletion keeps, how long each kind of data is kept, our breach response steps, and announcement consent.',
  '/data',
);

const SECTIONS: LegalSection[] = [
  {
    id: 'download',
    title: 'Download your data',
    body: (
      <>
        <p>
          Signed in as a volunteer, go to <Link href="/me/account">Me</Link> and choose <strong>Download my data</strong>. You get one JSON file with
          everything about you: your account, every check-in and its hours, your records and badges, your messages and chat posts, and saved events.
        </p>
        <p>Coordinators can download their funder report as a CSV, and print hour letters, from the app.</p>
      </>
    ),
  },
  {
    id: 'delete',
    title: 'Delete your account',
    body: (
      <>
        <p>
          Go to <Link href="/me/account">Me</Link>, choose <strong>Delete my account</strong>, and type DELETE to confirm. It happens at once and can’t be
          undone, so download your data first if you want a copy.
        </p>
        <DataTable
          head={['Deleted', 'Kept, without your name']}
          rows={[
            [
              'Your name, email, birth date and Google link; your messages, chat posts, badges and saved events; every share link (they stop working)',
              'Your check-in rows at each organization, renamed “Former volunteer”, so the hours an organization already confirmed still add up in its totals. A reason a coordinator wrote for changing your hours stays with that row.',
            ],
          ]}
        />
        <p>
          Organizations can’t delete themselves in the app yet. A coordinator who wants their organization removed can ask us; see “Contact” on the{' '}
          <Link href="/privacy#contact">Privacy policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long each thing is kept',
    body: (
      <>
        <DataTable
          head={['Data', 'Kept for']}
          rows={[
            ['Volunteer account and records', 'Until you delete your account, or the demo database is reset.'],
            ['Check-in times and confirmed hours', 'As long as the organization’s records exist. After you delete your account, without your name.'],
            ['Leave-the-area signal (opt-in)', 'Until the event is verified, then deleted.'],
            ['Photos of paper sign-in sheets', 'Not kept. Only the rows a coordinator confirms are saved.'],
            ['Voice debriefs and video clips', 'Until the coordinator deletes them. Voice notes are never public.'],
            ['Messages', 'Until you delete your account (yours), or the organization’s data is removed.'],
            ['Sign-in cookies', '1 year for volunteers, 30 days for coordinators, or until you sign out.'],
            ['Host request logs', 'A short period set by our host, for running and securing the service.'],
          ]}
        />
        <p>
          This is a demo, so the whole database may be reset at any time. If you need a lasting copy of a record, print it or save it as a PDF.
        </p>
      </>
    ),
  },
  {
    id: 'consent',
    title: 'Announcements and consent',
    body: (
      <>
        <p>
          Organizations can send announcements in the app. Getting them is <strong>off until you turn it on</strong> in{' '}
          <Link href="/me/account">Me</Link>, and we note the time you did. Turn it off the same way, any time.
        </p>
        <p>
          SycaMore Live doesn’t send marketing email, and we never sell or rent your contact details.
        </p>
      </>
    ),
  },
  {
    id: 'breach',
    title: 'If there’s a data breach',
    body: (
      <>
        <p>If we learn that someone got at data they shouldn’t have, this is what we’ll do:</p>
        <ol>
          <li>
            <strong>Contain it</strong> straight away: close the hole, rotate keys and PINs, and take the service offline if we need to.
          </li>
          <li>
            <strong>Work out what happened</strong>: which data, whose, and how, and keep notes as we go.
          </li>
          <li>
            <strong>Tell the people affected</strong> without undue delay, and within 72 hours of confirming it where we can: what happened, what data, and
            what you should do. For a minor, we tell their organization and ask it to reach their guardian.
          </li>
          <li>
            <strong>Tell the organizations</strong> whose volunteers are affected, and the authorities where the law requires it.
          </li>
          <li>
            <strong>Fix the cause</strong> and post a short public write-up of what changed.
          </li>
        </ol>
        <p>
          If you think you’ve found a security problem, please tell us: <Contact />
        </p>
      </>
    ),
  },
];

export default function DataPage() {
  return (
    <LegalPage
      title="Your data"
      lede="How to download or delete it, what deletion keeps, and how long everything is kept."
      summary={[
        'Download everything about you as one file, from Me in the app.',
        'Delete your account any time. Your name goes; the organization’s confirmed totals stay, labelled “Former volunteer”.',
        'The leave-the-area signal is deleted when the event is verified. Sheet photos aren’t kept at all.',
        'Announcements are off until you turn them on.',
        'If there’s a breach, we contain it, tell the people affected quickly, and fix the cause.',
      ]}
      sections={SECTIONS}
      related={[
        { href: '/privacy', label: 'Privacy policy' },
        { href: '/terms', label: 'Terms of use' },
        { href: '/me/account', label: 'Your account' },
      ]}
    />
  );
}
