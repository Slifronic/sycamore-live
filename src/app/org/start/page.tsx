import Link from 'next/link';
import { StartForm } from './StartForm';
import { AuthArt } from '../AuthArt';
import s from '../auth.module.css';

export default function StartPage() {
  return (
    <main className={s.page}>
      <div className={s.split}>
        <AuthArt line="A QR code on the table, two minutes to verify, a record every volunteer can share." />
        <div className={`${s.box} rise`}>
          <Link href="/" className={s.back}>
            ← SycaMore Live
          </Link>
          <h1>Set up your organization</h1>
          <p className="muted">Four boxes, about a minute. You’ll land on a practice event and a 7-minute course that teaches the rest by doing.</p>
          <StartForm />
        </div>
      </div>
    </main>
  );
}
