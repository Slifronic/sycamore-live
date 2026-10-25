import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { AuthArt } from '../AuthArt';
import s from '../auth.module.css';

export default function LoginPage() {
  return (
    <main className={s.page}>
      <div className={s.split}>
        <AuthArt line="Your events, your roster, your verified hours." />
        <div className={`${s.box} rise`}>
          <Link href="/" className={s.back}>
            ← SycaMore Live
          </Link>
          <h1>Coordinator sign in</h1>
          <p className="muted">Enter your organization’s 6-digit PIN.</p>
          <LoginForm />
          <p className="small muted">
            New here?{' '}
            <Link href="/org/start" className={s.cta}>
              Set up your organization
            </Link>{' '}
            in about a minute. Demo PIN: <strong>246810</strong>
          </p>
        </div>
      </div>
    </main>
  );
}
