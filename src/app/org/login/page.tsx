import Link from 'next/link';
import { LoginForm } from './LoginForm';
import s from '../auth.module.css';

export default function LoginPage() {
  return (
    <main className={s.page}>
      <div className={s.box}>
        <Link href="/" className={s.back}>← SycaMore Live</Link>
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
    </main>
  );
}
