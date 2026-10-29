import Link from 'next/link';
import { Icon } from '@/components/shell/icons';
import { GoogleButton, AUTH_ERRORS } from '@/components/auth/GoogleButton';
import { readPending } from '@/lib/accounts';
import { googleOAuthReady } from '@/lib/google-oauth';
import { StartForm } from './StartForm';
import { AuthArt } from '../AuthArt';
import s from '../auth.module.css';

export const metadata = {
  title: 'Set up your organization',
  description: 'Set up your organization in about a minute: sign in with Google, three boxes, then a practice event and a short course that teaches by doing.',
};

// Reads the pending Google sign-in cookie, so it renders per request.
export const instant = false;

export default async function StartPage({ searchParams }: PageProps<'/org/start'>) {
  const sp = await searchParams;
  const google = googleOAuthReady();
  const pending = google ? await readPending('org') : null;
  const error = typeof sp.error === 'string' ? AUTH_ERRORS[sp.error] : undefined;
  return (
    // Not a <main> element: after sign-in the app keeps this page mounted (hidden) for back
    // navigation, and the org shell has its own <main>. The role keeps the landmark here.
    <div className={s.page} role="main">
      <div className={s.split}>
        <AuthArt line="A QR code on the table, two minutes to verify, a record every volunteer can share." />
        <div className={`${s.box} rise`}>
          <Link href="/" className={s.back}>
            <Icon name="chevron-left" size={16} /> SycaMore Live
          </Link>
          <h1>Set up your organization</h1>
          {error && (
            <p className="notice notice-red" role="alert">
              {error}
            </p>
          )}
          {google && !pending ? (
            <>
              <p className="muted">
                Step 1 of 2: sign in with the Google account you’ll run volunteers from. You’ll be the organization’s owner and can add other
                coordinators later.
              </p>
              <GoogleButton intent="org" label="Continue with Google" />
              <p className="small muted">
                Already set up?{' '}
                <Link href="/signin?as=org" className={s.cta}>
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="muted">
                {pending ? (
                  <>
                    Step 2 of 2. Signed in as <strong>{pending.email}</strong>. A practice event and a short course are waiting inside.
                  </>
                ) : (
                  'Four boxes, about a minute. A practice event and a short course are waiting inside.'
                )}
              </p>
              <StartForm owner={pending ? { name: pending.name, email: pending.email } : null} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
