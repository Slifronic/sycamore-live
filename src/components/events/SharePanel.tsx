'use client';

import { useState } from 'react';
import { Icon } from '../shell/icons';
import { toast } from '../shell/Toast';
import { HelpTip } from '../media/HelpTip';
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
  const copy = async (what: 'link' | 'text', v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(what === 'link' ? 'Link copied' : 'Message copied');
    } catch {
      toast.warning('This browser blocked copying', { body: 'Select the text and copy it by hand.' });
    }
  };
  const enc = encodeURIComponent;

  return (
    <section className={`card ${s.panel}`} aria-labelledby="share-title">
      <div className={s.head}>
        <div className={s.headText}>
          <h2 id="share-title" className={s.title}>
            Share with volunteers
          </h2>
          <HelpTip label="What this link is">
            One page with the map, directions and add-to-calendar, for your group chats and people who aren’t on SycaMore yet. The check-in QR code stays with
            you. To message volunteers who’ve served with you, use Announce.
          </HelpTip>
        </div>
        <a className="btn btn-sm btn-quiet" href={url} target="_blank" rel="noopener">
          Open page <Icon name="arrow-up-right" size={14} />
        </a>
      </div>

      <div className={s.linkRow}>
        <input className="input" readOnly value={url} aria-label="Event page link" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary" onClick={() => copy('link', url)}>
          <Icon name="copy" size={16} /> Copy link
        </button>
      </div>

      <div className={s.send}>
        <button
          type="button"
          className="btn btn-sm"
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
          <Icon name="share" size={16} /> Share…
        </button>
        <button type="button" className="btn btn-sm" onClick={() => copy('text', text)}>
          <Icon name="copy" size={16} /> Copy message
        </button>
        <a className="btn btn-sm btn-quiet" href={`https://wa.me/?text=${enc(text)}`} target="_blank" rel="noopener">
          WhatsApp
        </a>
        <a className="btn btn-sm btn-quiet" href={`sms:?&body=${enc(text)}`}>
          Text
        </a>
        <a className="btn btn-sm btn-quiet" href={`mailto:?subject=${enc(title)}&body=${enc(text)}`}>
          Email
        </a>
        <a className="btn btn-sm btn-quiet" href={`https://t.me/share/url?url=${enc(url)}&text=${enc(text.replace(url, '').trim())}`} target="_blank" rel="noopener">
          Telegram
        </a>
      </div>

      <details className={s.edit}>
        <summary>
          <Icon name="chevron-right" size={14} className={s.chev} /> Edit the message
        </summary>
        <textarea id="announce" className="input" rows={7} value={text} onChange={(e) => setText(e.target.value)} aria-label="Announcement" />
      </details>

      <div className={s.cal}>
        <span>Add to your calendar</span>
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
