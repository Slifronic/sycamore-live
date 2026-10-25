import Link from 'next/link';
import { Icon } from '@/components/shell/icons';
import { safeOrgNext } from '@/lib/session';
import { LoginForm } from './LoginForm';
import { AuthArt } from '../AuthArt';
import s from '../auth.module.css';

export const metadata = {
  title: 'Coordinator sign in',
  description: 'Sign in with your organization’s 6-digit PIN to run events, verify hours and message your volunteers.',
};

export default async function LoginPage({ searchParams }: PageProps<'/org/login'>) {
  const next = safeOrgNext((await searchParams).next);
  return (
    // Not a <main> element: after sign-in the app keeps this page mounted (hidden) for back
    // navigation, and the org shell has its own <main>. The role keeps the landmark here.
    <div className={s.page} role="main">
      <div className={s.split}>
        <AuthArt line="Your events, your roster, your verified hours." />
        <div className={`${s.box} rise`}>
          <Link href="/" className={s.back}>
            <Icon name="chevron-left" size={16} /> SycaMore Live
          </Link>
          <h1>Coordinator sign in</h1>
          <p className="muted">Enter your organization’s 6-digit PIN.</p>
          <LoginForm next={next} />
          <p className="small muted">
            New here?{' '}
            <Link href="/org/start" className={s.cta}>
              Set up your organization
            </Link>{' '}
            in about a minute. Demo PIN: <strong>246810</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
