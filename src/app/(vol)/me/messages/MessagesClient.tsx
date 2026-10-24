'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import s from './messages.module.css';

const MAX = 1000;
const endpoint = (kind: 'org' | 'event', id: string) => (kind === 'org' ? '/api/vol/messages' : `/api/vol/event-chats/${id}`);

// While a conversation is on screen: mark it read (that's what flips the
// coordinator's "Delivered" to "Read"), keep it scrolled to the newest message,
// and pull new messages every 15 seconds while the tab is visible.
export function LiveThread({ kind, id, lastUnreadId }: { kind: 'org' | 'event'; id: string; lastUnreadId: string | null }) {
  const router = useRouter();
  const marked = useRef<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 15_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    const key = `${id}:${lastUnreadId ?? ''}`;
    if (marked.current === key || document.visibilityState !== 'visible') return;
    marked.current = key;
    const body = kind === 'org' ? { org_id: id, read: true } : { read: true };
    void fetch(endpoint(kind, id), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then((r) => (r.ok ? router.refresh() : undefined))
      .catch(() => {});
  }, [kind, id, lastUnreadId, router]);

  useEffect(() => {
    const el = document.getElementById('vol-stream');
    if (el) el.scrollTop = el.scrollHeight;
  });
  return null;
}

// Shows the reply at once; on an error the text comes back with the API's message.
export function Composer({ kind, id, placeholder }: { kind: 'org' | 'event'; id: string; placeholder: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState('');

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(body);
    setText('');
    setError('');
    try {
      const res = await fetch(endpoint(kind, id), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(kind === 'org' ? { org_id: id, body } : { body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setText(body);
        setError(data.error ?? 'That didn’t send. Try again.');
      } else router.refresh();
    } catch {
      setText(body);
      setError('No connection. Your message is still here; send it when you have signal.');
    }
    setSending(null);
  };

  return (
    <form
      className={s.composer}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {sending && <div className={`${s.bubble} ${s.mine} ${s.sending}`}>{sending}</div>}
      <label className="sr-only" htmlFor="vol-reply">
        Your message
      </label>
      <textarea
        id="vol-reply"
        className="input"
        rows={2}
        value={text}
        maxLength={MAX}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send();
        }}
      />
      {error && (
        <p className="notice notice-red small" role="alert">
          {error}
        </p>
      )}
      <div className="row between">
        <span className="small muted num">
          {text.length.toLocaleString()} / {MAX.toLocaleString()}
        </span>
        <button className="btn btn-primary" disabled={!!sending || !text.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
