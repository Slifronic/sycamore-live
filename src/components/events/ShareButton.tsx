'use client';

import { useState } from 'react';

// "Share" opens the phone's share sheet (Messages, WhatsApp, GroupMe...);
// on a laptop it copies the link instead.
export function ShareButton({ url, title, text, label = 'Share this event', className = 'btn btn-sm' }: { url: string; title: string; text?: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) await navigator.share({ title, text, url });
          else {
            await navigator.clipboard.writeText(url);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }
        } catch {
          /* the share sheet was closed */
        }
      }}
    >
      {done ? 'Link copied' : label}
    </button>
  );
}
