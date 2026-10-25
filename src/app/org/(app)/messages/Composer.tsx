'use client';

import { useActionState, useRef, useState } from 'react';
import { sendMessage } from './actions';
import s from './messages.module.css';

const MAX = 1000;

// Quick replies a coordinator sends over and over. They're plain text, so the
// coordinator sees and can edit every word before it goes.
const QUICK = [
  { label: 'Fixed your hours', text: 'Thanks for letting me know. I fixed your hours, and the change will show on your record with the reason.' },
  { label: 'See you there', text: 'Yes, see you there! Scan the QR code at the sign-in table when you arrive.' },
  { label: 'Thank you', text: 'Thank you for coming out. It made a real difference.' },
];

export function Composer({ volunteerId, firstName }: { volunteerId: string; firstName: string }) {
  const [state, action, pending] = useActionState(sendMessage, null);
  const [text, setText] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);

  // Clear the box after each successful send.
  const [cleared, setCleared] = useState<number | undefined>();
  if (state?.sentAt && state.sentAt !== cleared) {
    setCleared(state.sentAt);
    setText('');
  }

  return (
    <form ref={form} action={action} className={s.composer}>
      <input type="hidden" name="volunteer_id" value={volunteerId} />
      <label className="sr-only" htmlFor="reply">
        Message to {firstName}
      </label>
      <textarea
        ref={box}
        id="reply"
        name="body"
        className="input"
        placeholder={`Write to ${firstName}…`}
        value={text}
        maxLength={MAX}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) form.current?.requestSubmit();
        }}
      />
      {state?.error && <p className="notice notice-red small">{state.error}</p>}
      <div className={s.composeBar}>
        <div className={s.templates} aria-label="Quick replies">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setText((t) => (t.trim() ? `${t.trim()} ${q.text}` : q.text));
                box.current?.focus();
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className={s.composeHint} aria-hidden>
            <span className="kbd">⌘</span>
            <span className="kbd">↵</span>
          </span>
          <span className={s.count} aria-live="polite">
            {text.length.toLocaleString()} / {MAX.toLocaleString()}
          </span>
          <button className="btn btn-primary btn-sm" disabled={pending || !text.trim()}>
            {pending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </form>
  );
}
