import Link from 'next/link';
import { Icon } from '@/components/shell/icons';
import { StartForm } from './StartForm';
import { AuthArt } from '../AuthArt';
import s from '../auth.module.css';

export const metadata = {
  title: 'Set up your organization',
  description: 'Set up your organization in about a minute: four boxes, then a practice event and a short course that teaches by doing.',
};

export default function StartPage() {
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
          <p className="muted">Four boxes, about a minute. A practice event and a short course are waiting inside.</p>
          <StartForm />
        </div>
      </div>
    </div>
  );
}
