import Link from 'next/link';
import { currentVolunteer, safeNext } from '@/lib/vol-data';
import { volSignOut } from '../actions';
import { JoinForm } from './JoinForm';
import s from '../pages.module.css';

// Contract: /join. Name, email and date of birth on one screen. Under 13 is
// refused with nothing stored; 13 to 17 can join and see their hours, but
// sharing needs a guardian's OK. An existing email signs back in with its
// birth date. ?next= brings them back to where they were (a QR check-in).

export default async function JoinPage({ searchParams }: PageProps<'/join'>) {
  const next = safeNext((await searchParams).next);
  const vol = await currentVolunteer();

  return (
    <div className={s.narrow}>
      <header className={s.center}>
        <p className="eyebrow eyebrow-sap">For volunteers</p>
        <h1 className={s.bigTitle}>Your hours, recorded as you serve.</h1>
        <p className="page-lede">
          Check in and out on your phone. The organization confirms your hours when the event closes, and you get a record anyone can check.
        </p>
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
      <p className={`${s.center} small muted`}>
        Signed up at an event before? Use the same email and date of birth. Coordinators <Link href="/org/login">sign in here</Link>.
      </p>
    </div>
  );
}

export const instant = false;
