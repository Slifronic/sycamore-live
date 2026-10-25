import Link from 'next/link';
import { Contact, LegalPage, type LegalSection } from '@/components/site/Legal';
import { pageMeta } from '@/components/site/meta';

export const metadata = pageMeta(
  'Terms of use',
  'The plain-language terms for using SycaMore Live: who can use it, accounts, what coordinators attest to, acceptable use, your content, AI drafts, and the demo’s limits.',
  '/terms',
);

const SECTIONS: LegalSection[] = [
  {
    id: 'service',
    title: 'Using SycaMore Live',
    body: (
      <>
        <p>
          SycaMore Live is a student project running as a demo. By using it, you agree to these terms and to the{' '}
          <Link href="/privacy">Privacy policy</Link>. If you don’t agree, please don’t use it.
        </p>
        <p>
          It’s free. Prices on the <Link href="/pricing">Pricing page</Link> are planned, not charged: there’s no checkout and no payment details are
          collected. If that ever changes, we’ll ask you to agree to payment terms first.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use it',
    body: (
      <ul>
        <li>You must be at least 13 to make a volunteer account. Under 13 is refused.</li>
        <li>If you’re 13 to 17, a parent or guardian must know you’re using SycaMore Live, and sharing a record needs their OK.</li>
        <li>A coordinator must be an adult who is allowed to act for their organization.</li>
      </ul>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts',
    body: (
      <ul>
        <li>Use your real name and an email you can reach. One account per person.</li>
        <li>Coordinators: keep your PIN private. Anyone with it can act as your organization.</li>
        <li>Don’t sign in as someone else, or check someone else in or out.</li>
        <li>
          You can delete your volunteer account at any time from <Link href="/me/account">Me</Link>. What deletion keeps is explained on{' '}
          <Link href="/data">Your data</Link>.
        </li>
      </ul>
    ),
  },
  {
    id: 'coordinators',
    title: 'What coordinators attest to',
    body: (
      <>
        <p>
          A verified record is <strong>your organization’s statement</strong>, not ours. When you verify an event, you confirm that, to the best of your
          knowledge, each person listed served at that event, in that role, for those hours.
        </p>
        <ul>
          <li>Only verify hours you believe are accurate. Give a true reason for every change.</li>
          <li>Check every row drafted from a paper sheet against the sheet before you confirm it.</li>
          <li>If a record turns out to be wrong, revoke it. Don’t leave a false record standing.</li>
          <li>
            Only upload photos, videos or voice notes you’re allowed to, and only mark a clip as consented if everyone recognizable in it (and a guardian,
            for a minor) agreed.
          </li>
          <li>Use volunteers’ details only to run your events and keep your records, and keep messages to minors to announcements.</li>
        </ul>
        <p>SycaMore Live records the times and who vouched. It doesn’t observe or grade the work itself.</p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>Don’t use SycaMore Live to:</p>
        <ul>
          <li>Create false hours, fake events or fake organizations, or help someone else do so.</li>
          <li>Harass anyone, or send spam, hateful, sexual or violent content.</li>
          <li>Contact a minor outside the announcements the service allows.</li>
          <li>Upload anything that isn’t yours to share, or that breaks the law.</li>
          <li>Probe, overload or break the service, scrape it, or try to get into accounts that aren’t yours.</li>
          <li>Slip instructions into sheets or pasted text to steer the AI drafts.</li>
        </ul>
        <p>We may remove content or close accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Your content, and ours',
    body: (
      <>
        <p>
          <strong>Yours stays yours.</strong> Event details, messages, debriefs, clips and stories belong to whoever made them. You let us store, show and
          process them only to run the service, including showing a shared record, an event page or a published story to anyone with its link.
        </p>
        <p>
          <strong>Ours:</strong> the SycaMore Live name, design and code belong to the team. Open-source parts keep their own licenses; see{' '}
          <Link href="/licenses">Licenses</Link>. Photos and illustrations on the marketing pages are AI-generated.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI drafts',
    body: (
      <p>
        Some features use Claude (Anthropic) or OpenAI to draft rows, event details, wording and stories. Drafts can be wrong. Nothing a model drafts
        counts until a person confirms it, and the app rejects or flags numbers that aren’t in the record. You’re responsible for what you confirm, send
        or publish.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Demo status and disclaimers',
    body: (
      <>
        <p>
          SycaMore Live is provided <strong>as is</strong>, while it’s a demo. It may change, break, lose data or be reset without notice, and sign-in is
          demo-grade. Don’t rely on it as your only copy of anything important: download your data or print your records.
        </p>
        <p>
          We don’t promise that a school, program or scholarship will accept a record; that’s their decision. To the extent the law allows, the team isn’t
          liable for indirect losses from using the service, and our total liability is limited to what you paid us, which is nothing.
        </p>
      </>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your use',
    body: (
      <p>
        You can stop using SycaMore Live at any time and delete your account. We may suspend accounts that break these terms. If the project shuts down,
        we’ll give notice on this site first, with time to download your data.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        If we change these terms, we’ll update this page and the date at the top. For a change that matters, we’ll tell signed-in users in the app before
        it applies. Using the service after that means you accept the new terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms: <Contact />
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      lede="The rules for using SycaMore Live, in plain language."
      summary={[
        'It’s a free student demo. Nothing is charged, and it may change or be reset.',
        'Volunteers must be 13 or older; 13 to 17 need a parent or guardian to know.',
        'A verified record is the organization’s statement. Coordinators verify only hours they believe are true, with a reason for every change.',
        'Don’t fake hours, harass anyone, or contact minors outside announcements.',
        'Your content stays yours. AI drafts are only drafts until a person confirms them.',
      ]}
      sections={SECTIONS}
      related={[
        { href: '/privacy', label: 'Privacy policy' },
        { href: '/data', label: 'Your data' },
        { href: '/licenses', label: 'Licenses' },
      ]}
    />
  );
}
