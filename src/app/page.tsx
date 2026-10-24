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
        <div className={s.doors}>
          <section className={`card ${s.door}`} aria-labelledby="door-vol">
            <p className="eyebrow eyebrow-sap">For volunteers</p>
            <h2 id="door-vol">Your hours, confirmed and yours to share</h2>
            <p className="muted">At an event? Scan the QR code at the sign-in table. You never type your hours.</p>
            <div className={s.ctas}>
              <Link className="btn btn-primary btn-big" href="/me">
                My hours
              </Link>
              <Link className="btn btn-big" href="/checkin">
                Check in
              </Link>
            </div>
            <p className="small muted">
              New? <Link href="/join">Join in one step</Link>, or just scan the code at your event.
            </p>
          </section>
          <section className={`card ${s.door}`} aria-labelledby="door-org">
            <p className="eyebrow eyebrow-sap">For coordinators</p>
            <h2 id="door-org">Run the event, verify in two minutes</h2>
            <p className="muted">Put a QR code on screen, watch the roster fill, and confirm everyone’s hours when you close.</p>
            <div className={s.ctas}>
              <Link className="btn btn-primary btn-big" href="/org/start">
                Set up your organization
              </Link>
              <Link className="btn btn-big" href="/org/login">
                Sign in
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
