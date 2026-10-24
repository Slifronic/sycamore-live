import Link from 'next/link';
import s from './landing.module.css';

// Any link that doesn't lead anywhere: a mistyped /c/, /w/ or /e/ address, an
// old walk-in QR after the coordinator made a new one, or a page that was taken down.
export default function NotFound() {
  return (
    <main className={s.page}>
      <div className={s.inner}>
        <p className={s.kicker}>SycaMore Live</p>
        <h1 className={s.title}>This link doesn’t lead anywhere</h1>
        <p className={s.lede}>
          It may be mistyped, or the page was taken down. If someone gave you this link at an event, ask the coordinator for a fresh one.
        </p>
        <p>
          <Link href="/" className="btn btn-primary btn-big">
            Go to SycaMore Live
          </Link>
        </p>
      </div>
    </main>
  );
}
