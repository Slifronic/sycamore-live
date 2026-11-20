'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { PublicFrame } from '@/components/site/PublicFrame';
import { Icon } from '@/components/shell/icons';
import s from './not-found.module.css';

// Anything a page throws lands here instead of Next's bare error screen. The
// reference is the digest Next logs on the server next to the real error, so a
// volunteer can read it out and the logs say exactly what happened. The message
// itself is never shown: in production it is hidden anyway, and it can hold details.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PublicFrame note="SycaMore Live records volunteer hours as the event happens.">
      <div className={s.wrap} role="alert">
        <span className={s.icon} aria-hidden="true">
          <Icon name="compass" size={28} />
        </span>
        <p className={s.code}>Something went wrong</p>
        <h1 className={s.title}>This page didn’t load</h1>
        <p className={s.lede}>
          Hours that were already recorded are safe. Try again, and if it keeps failing, tell the coordinator
          {error.digest ? (
            <>
              {' '}
              and mention reference <strong>{error.digest}</strong>
            </>
          ) : null}
          .
        </p>
        <div className={s.actions}>
          <button type="button" className="btn btn-primary btn-big" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-big">
            Go to SycaMore Live
          </Link>
        </div>
      </div>
    </PublicFrame>
  );
}
