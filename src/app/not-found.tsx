import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicFrame } from '@/components/site/PublicFrame';
import { Icon } from '@/components/shell/icons';
import s from './not-found.module.css';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This link doesn’t lead anywhere on SycaMore Live.',
  robots: { index: false, follow: false },
};

// Any link that doesn't lead anywhere: a mistyped /c/, /w/ or /e/ address, an
// old walk-in QR after the coordinator made a new one, or a page that was taken down.
export default function NotFound() {
  return (
    <PublicFrame note="SycaMore Live records volunteer hours as the event happens.">
      <div className={s.wrap}>
        <span className={s.icon} aria-hidden="true">
          <Icon name="compass" size={28} />
        </span>
        <p className={s.code}>404</p>
        <h1 className={s.title}>This link doesn’t lead anywhere</h1>
        <p className={s.lede}>It may be mistyped, or the page was taken down. Got it at an event? Ask the coordinator for a fresh one.</p>
        <div className={s.actions}>
          <Link href="/" className="btn btn-primary btn-big">
            Go to SycaMore Live
          </Link>
          <Link href="/me" className="btn btn-big">
            My hours
          </Link>
        </div>
        <ul className={s.more}>
          <li>
            <Link href="/checkin">Check in at an event</Link>
          </li>
          <li>
            <Link href="/discover">Discover events</Link>
          </li>
          <li>
            <Link href="/org/login">Coordinator sign in</Link>
          </li>
        </ul>
      </div>
    </PublicFrame>
  );
}
