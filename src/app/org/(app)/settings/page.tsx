import { sql } from '@/lib/db';
import { currentAccount, requireOrg } from '@/lib/session';
import { googleOAuthReady } from '@/lib/google-oauth';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { GoogleButton, AUTH_ERRORS } from '@/components/auth/GoogleButton';
import { ToastOnMount } from '@/components/shell/Toast';
import { PinReveal } from '@/components/PinReveal';
import { InviteForm, MemberButton, PinSwitch, SignOutEverywhere } from './SettingsForms';
import s from './settings.module.css';

export const metadata = {
  title: 'Account and team',
  description: 'Who can sign in to your organization, how they sign in, and whether SycaMore has reviewed it.',
};

export default async function SettingsPage({ searchParams }: PageProps<'/org/settings'>) {
  const org = await requireOrg('/org/settings');
  const [me, sp] = await Promise.all([currentAccount(), searchParams]);
  const owner = me?.role === 'owner';
  const [members, invites] = await Promise.all([
    sql`
      select a.id, a.name, a.email, m.role, a.last_sign_in_at from org_member m join account a on a.id = m.account_id
      where m.org_id = ${org.id} order by (m.role = 'owner') desc, m.created_at` as unknown as Promise<
      { id: string; name: string; email: string; role: 'owner' | 'coordinator'; last_sign_in_at: Date | null }[]
    >,
    sql`select email, created_at from org_invite where org_id = ${org.id} and accepted_at is null order by created_at desc` as unknown as Promise<
      { email: string; created_at: Date }[]
    >,
  ]);
  const hasOwner = members.some((m) => m.role === 'owner');
  const error = typeof sp.error === 'string' ? AUTH_ERRORS[sp.error] : undefined;

  return (
    <div className={`page ${s.page}`}>
      {sp.linked === '1' && <ToastOnMount id="linked" message="Google is linked" body="You can sign in with Google from now on." />}
      <PageHeader eyebrow={org.name} title="Account and team" lede="Who can sign in to your organization, and how." />
      {error && (
        <p className="notice notice-red" role="alert">
          {error}
        </p>
      )}

      <Card as="section" pad className={s.card} aria-labelledby="you">
        <h2 id="you">You</h2>
        {me ? (
          <p>
            Signed in with Google as <strong>{me.name}</strong> ({me.email}) <Chip tone={owner ? 'green' : 'ink'}>{owner ? 'Owner' : 'Coordinator'}</Chip>
          </p>
        ) : (
          <>
            <p className="muted">
              You signed in with the organization’s PIN. Link a Google account so you can sign in without it
              {hasOwner ? ' (you’ll join as a coordinator).' : ', and become the organization’s owner.'}
            </p>
            {googleOAuthReady() ? (
              <div className={s.narrow}>
                <GoogleButton intent="link" label="Link Google" />
              </div>
            ) : (
              <p className="small muted">Google sign-in isn’t switched on for this site yet (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).</p>
            )}
          </>
        )}
      </Card>

      <Card as="section" pad className={s.card} aria-labelledby="team">
        <h2 id="team">Coordinators</h2>
        {members.length ? (
          <ul className={s.list}>
            {members.map((m) => (
              <li key={m.id} className={s.row}>
                <span>
                  <strong>{m.name}</strong> <span className="muted">{m.email}</span>
                </span>
                <span className={s.rowEnd}>
                  <Chip tone={m.role === 'owner' ? 'green' : 'ink'}>{m.role === 'owner' ? 'Owner' : 'Coordinator'}</Chip>
                  {owner && m.role !== 'owner' && <MemberButton accountId={m.id} label={`Remove ${m.name}`} />}
                </span>
              </li>
            ))}
            {invites.map((i) => (
              <li key={i.email} className={s.row}>
                <span>
                  <strong>{i.email}</strong> <span className="muted">invited, not signed in yet</span>
                </span>
                {owner && <MemberButton email={i.email} label={`Cancel the invite for ${i.email}`} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nobody has linked a Google account yet.</p>
        )}
        {owner ? (
          <InviteForm />
        ) : (
          <p className="small muted">The owner adds and removes coordinators.</p>
        )}
      </Card>

      <Card as="section" pad className={s.card} aria-labelledby="pin">
        <h2 id="pin">PIN sign-in</h2>
        {org.pin_enabled ? (
          <>
            <p className="muted">
              Anyone with the 6-digit PIN can sign in as your organization. It’s on for organizations set up before Google sign-in. Once everyone
              who runs events has Google, turn it off.
            </p>
            <PinReveal pin={org.coordinator_pin} />
          </>
        ) : (
          <p className="muted">Off. Coordinators sign in with Google.</p>
        )}
        {owner && <PinSwitch on={org.pin_enabled} />}
      </Card>

      <Card as="section" pad className={s.card} aria-labelledby="review">
        <h2 id="review">Organization review</h2>
        {org.reviewed_at ? (
          <p>
            <Chip tone="green">Reviewed</Chip> SycaMore confirmed {org.name} is a real organization. Your shared records say “Verified”.
          </p>
        ) : (
          <p className="muted">
            Not reviewed yet. Until SycaMore checks that {org.name} is real (a website, EIN or school listing, and an email at its domain), your shared
            records say “Attested by {org.name}” instead of “Verified”.{' '}
            <a href={`mailto:review@sycamore.app?subject=${encodeURIComponent(`Review request: ${org.name}`)}`}>Ask for a review</a>.
          </p>
        )}
      </Card>

      {owner && (
        <Card as="section" pad className={s.card} aria-labelledby="sessions">
          <h2 id="sessions">Sessions</h2>
          <p className="muted">Lost a laptop, or someone stopped helping? Sign every other device out of {org.name}.</p>
          <SignOutEverywhere />
        </Card>
      )}
    </div>
  );
}

// Reads the session cookie or a token from the URL, so it renders per request.
export const instant = false;
