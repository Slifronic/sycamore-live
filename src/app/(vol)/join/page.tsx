import Image from 'next/image';
import Link from 'next/link';
import { currentVolunteer, safeNext } from '@/lib/vol-data';
import { ToastOnMount } from '@/components/shell/Toast';
import { volSignOut } from '../actions';
import { JoinForm } from './JoinForm';
import s from '../pages.module.css';

export const metadata = {
  title: 'Join',
  description: 'Join as a volunteer with your name, email and birth date to check in at events and keep your verified hours. Ages 13 and up.',
};

// Contract: /join. Name, email and date of birth on one screen, plus the
// required "I agree to the Terms and Privacy Policy" (13 to 17 also confirm a
// parent or guardian knows). Under 13 is refused with nothing stored. An
// existing email signs back in with its birth date. ?next= brings them back to
// where they were (a QR check-in). On a phone the form is the whole screen.

export default async function JoinPage({ searchParams }: PageProps<'/join'>) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const vol = await currentVolunteer();

  return (
    <div className={s.join}>
      {sp.deleted === '1' && <ToastOnMount id="deleted" message="Your account was deleted" body="Your hours stay with each organization, with no name attached." />}
      <figure className={s.joinArt}>
        <Image src="/media/photo/hero-creek-portrait.webp" alt="" fill preload sizes="460px" className={s.joinImg} />
        <figcaption className={s.joinSteps}>
          <ol>
            <li>
              <b>1</b> Scan in and out at the sign-in table
            </li>
            <li>
              <b>2</b> The organization confirms your hours
            </li>
            <li>
              <b>3</b> Share a record anyone can check
            </li>
          </ol>
        </figcaption>
      </figure>
      <div className={s.joinMain}>
        <header className={s.joinHead}>
          <p className="eyebrow eyebrow-sap">For volunteers</p>
          <h1 className={s.bigTitle}>Your hours, recorded as you serve.</h1>
          <p className="page-lede">Check in on your phone. The organization confirms your hours.</p>
        </header>
        {vol ? (
          <section className="card card-pad stack">
            <h2>You’re signed in as {vol.name}</h2>
            <p className="muted">On this phone, SycaMore already knows you.</p>
            <Link className="btn btn-primary btn-big" href={next}>
              Continue
            </Link>
            <form action={volSignOut}>
              <button className="btn btn-quiet">Not {vol.name.split(' ')[0]}? Sign out</button>
            </form>
          </section>
        ) : (
          <JoinForm next={next} />
        )}
        <p className="small muted">
          Joined at an event before? Use the same email and date of birth. For volunteers 13 and older. Coordinators <Link href="/org/login">sign in here</Link>.
        </p>
      </div>
    </div>
  );
}

export const instant = false;
