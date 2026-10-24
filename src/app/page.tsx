import Link from 'next/link';
import s from './landing.module.css';

export default function Home() {
  return (
    <main className={s.page}>
      <div className={s.inner}>
        <p className={s.kicker}>SycaMore Live</p>
        <h1 className={s.title}>Volunteer hours, recorded as the event happens.</h1>
        <p className={s.lede}>
          Volunteers scan in and out. The organization verifies the hours when the event closes. Every volunteer gets a
          record anyone can check. No clipboards, no hour letters.
        </p>
        <div className={s.ctas}>
          <Link className="btn btn-primary btn-big" href="/org/start">
            Set up your organization
          </Link>
          <Link className="btn btn-big" href="/org/login">
            Coordinator sign in
          </Link>
        </div>
        <p className="muted small">Volunteers: scan the QR code at your event. You don’t need to sign up first.</p>
      </div>
    </main>
  );
}
