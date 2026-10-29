import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/shell/icons';
import { AUTH_ERRORS, GoogleButton } from '@/components/auth/GoogleButton';
import { googleOAuthReady } from '@/lib/google-oauth';
import { emailReady } from '@/lib/mailer';
import { isDemo } from '@/lib/demo';
import { currentOrg, safeOrgNext } from '@/lib/session';
import { currentVolunteer, safeNext } from '@/lib/vol-data';
import { LoginForm } from '../org/login/LoginForm';
import { AuthArt } from '../org/AuthArt';
import { EmailCodeForm } from './EmailCodeForm';
import s from '../org/auth.module.css';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to SycaMore Live as a volunteer or a coordinator, with Google or an emailed code.',
};

// Reads ?as, ?next and ?error, so it renders per request.
export const instant = false;

export default async function SignInPage({ searchParams }: PageProps<'/signin'>) {
  const sp = await searchParams;
  const asOrg = sp.as === 'org';
  const error = typeof sp.error === 'string' ? AUTH_ERRORS[sp.error] : undefined;
  const google = googleOAuthReady();

  if (asOrg) {
    const next = safeOrgNext(sp.next);
    if (await currentOrg()) redirect(next);
    return (
      <Frame asOrg line="Your events, your roster, your verified hours." error={error}>
        <h1>Coordinator sign in</h1>
        <p className="muted">Run events, verify hours and message your volunteers.</p>
        {google && <GoogleButton intent="org" next={next} />}
        {google ? (
          <details className={s.more}>
            <summary>Sign in with an organization PIN</summary>
            <p className="small muted">For the demo organization, and organizations set up before Google sign-in.</p>
            <LoginForm next={next} />
          </details>
        ) : (
          <LoginForm next={next} />
        )}
        <p className="small muted">
          New here?{' '}
          <Link href="/org/start" className={s.cta}>
            Set up your organization
          </Link>{' '}
          in about a minute.
          {isDemo() && (
            <>
              {' '}
              Demo PIN: <strong>246810</strong>
            </>
          )}
        </p>
      </Frame>
    );
  }

  const next = safeNext(sp.next);
  const vol = await currentVolunteer();
  if (vol) redirect(next);
  return (
    <Frame asOrg={false} line="Your hours, recorded as you serve." error={error} next={next}>
      <h1>Volunteer sign in</h1>
      <p className="muted">See your hours, records and messages.</p>
      {google && <GoogleButton intent="vol" next={next} />}
      {google && emailReady() && <div className={s.or}>or get a code by email</div>}
      {emailReady() && <EmailCodeForm next={next} />}
      <p className="small muted">
        New to SycaMore?{' '}
        <Link href={`/join${next !== '/me' ? `?next=${encodeURIComponent(next)}` : ''}`} className={s.cta}>
          Join as a volunteer
        </Link>
      </p>
    </Frame>
  );
}

function Frame({ asOrg, line, error, next, children }: { asOrg: boolean; line: string; error?: string; next?: string; children: React.ReactNode }) {
  const volHref = next && next !== '/me' ? `/signin?next=${encodeURIComponent(next)}` : '/signin';
  return (
    <div className={s.page} role="main">
      <div className={s.split}>
        <AuthArt line={line} />
        <div className={`${s.box} rise`}>
          <Link href="/" className={s.back}>
            <Icon name="chevron-left" size={16} /> SycaMore Live
          </Link>
          <nav className={s.sides} aria-label="Who’s signing in">
            <Link href={volHref} className={s.side} aria-current={asOrg ? undefined : 'page'} replace>
              Volunteer
            </Link>
            <Link href="/signin?as=org" className={s.side} aria-current={asOrg ? 'page' : undefined} replace>
              Coordinator
            </Link>
          </nav>
          {error && (
            <p className="notice notice-red" role="alert">
              {error}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
