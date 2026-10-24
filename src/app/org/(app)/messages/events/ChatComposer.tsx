'use client';

import { useActionState, useRef, useState } from 'react';
import { postEventChat } from '../actions';
import s from '../messages.module.css';

const MAX = 1000;

const QUICK = [
  { label: 'Where we are', text: 'We’re set up at the sign-in table by the entrance. Scan the QR code there to check in.' },
  { label: 'Running late', text: 'Heads up: we’re starting a little late. See you soon!' },
  { label: 'Thanks all', text: 'Thank you all for coming out today. Your hours show in My hours as soon as I verify the event.' },
];

export function ChatComposer({ eventId, people }: { eventId: string; people: number }) {
  const [state, action, pending] = useActionState(postEventChat, null);
  const [text, setText] = useState('');
  const [cleared, setCleared] = useState<number | undefined>();
  const box = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  if (state?.sentAt && state.sentAt !== cleared) {
    setCleared(state.sentAt);
    setText('');
  }

  return (
    <form ref={form} action={action} className={s.composer}>
      <input type="hidden" name="event_id" value={eventId} />
      <label className="sr-only" htmlFor="chat-body">
        Message to the group
      </label>
      <textarea
        ref={box}
        id="chat-body"
        name="body"
        className="input"
        placeholder={`Message everyone in this event (${people})…`}
        value={text}
        maxLength={MAX}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) form.current?.requestSubmit();
        }}
      />
      {state?.error && <p className="notice notice-red small">{state.error}</p>}
      <div className={s.composeBar}>
        <div className={s.templates} aria-label="Quick messages">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setText(q.text);
                box.current?.focus();
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className={s.count}>
            {text.length.toLocaleString()} / {MAX.toLocaleString()}
          </span>
          <button className="btn btn-primary btn-sm" disabled={pending || !text.trim()}>
            {pending ? 'Posting…' : 'Post to group'}
          </button>
        </div>
      </div>
    </form>
  );
}
