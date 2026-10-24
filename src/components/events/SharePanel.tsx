'use client';

import { useState } from 'react';
import s from './share.module.css';

// "Share with volunteers": one link and a ready-to-send announcement for the
// group chats, texts and emails the org already uses. The coordinator can
// edit the wording before sending; nothing is sent from here.
export function SharePanel({
  url,
  title,
  announcement,
  links,
}: {
  url: string;
  title: string;
  announcement: string;
  links: { google: string; ics: string; outlook: string };
}) {
  const [text, setText] = useState(announcement);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied('blocked');
    }
  };
  const enc = encodeURIComponent;

  return (
    <section className={`card ${s.panel}`} aria-labelledby="share-title">
      <div className={s.head}>
        <div>
          <h2 id="share-title" style={{ fontSize: 18 }}>
            Share with volunteers
          </h2>
          <p className="small muted">One link with the map, directions and add-to-calendar, for your group chats and people who aren’t on SycaMore yet. The check-in QR code stays with you. To reach volunteers who’ve served with you, use 📣 Send announcement.</p>
        </div>
        <a className="btn btn-sm" href={url} target="_blank" rel="noopener">
          Open event page ↗
        </a>
      </div>

      <div className={s.linkRow}>
        <input className="input" readOnly value={url} aria-label="Event page link" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary" onClick={() => copy('link', url)}>
          {copied === 'link' ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      <div className="field">
        <label htmlFor="announce">Announcement</label>
        <textarea id="announce" className="input" rows={7} value={text} onChange={(e) => setText(e.target.value)} />
        <span className="hint">Edit it here, then send it wherever your volunteers are.</span>
      </div>

      <div className={s.send}>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            if (navigator.share) {
              try {
                await navigator.share({ title, text });
              } catch {
                /* closed */
              }
            } else copy('text', text);
          }}
        >
          📤 Share…
        </button>
        <button type="button" className="btn" onClick={() => copy('text', text)}>
          {copied === 'text' ? '✓ Copied' : '📋 Copy message'}
        </button>
        <a className="btn" href={`https://wa.me/?text=${enc(text)}`} target="_blank" rel="noopener">
          WhatsApp
        </a>
        <a className="btn" href={`sms:?&body=${enc(text)}`}>
          Text message
        </a>
        <a className="btn" href={`mailto:?subject=${enc(title)}&body=${enc(text)}`}>
          Email
        </a>
        <a className="btn" href={`https://t.me/share/url?url=${enc(url)}&text=${enc(text.replace(url, '').trim())}`} target="_blank" rel="noopener">
          Telegram
        </a>
      </div>
      {copied === 'blocked' && <p className="notice notice-amber small">This browser blocked copying. Select the text and copy it by hand.</p>}

      <div className={s.cal}>
        <span className="small muted">Put it on your own calendar:</span>
        <a className="btn btn-sm btn-quiet" href={links.google} target="_blank" rel="noopener">
          Google
        </a>
        <a className="btn btn-sm btn-quiet" href={links.ics}>
          Apple / .ics
        </a>
        <a className="btn btn-sm btn-quiet" href={links.outlook} target="_blank" rel="noopener">
          Outlook
        </a>
      </div>
    </section>
  );
}
