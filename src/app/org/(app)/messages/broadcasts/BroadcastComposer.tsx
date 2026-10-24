'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import { draftBroadcastAction, sendBroadcastAction } from '../actions';
import s from '../messages.module.css';

type Opt = { key: string; label: string; count: number };
type Ev = { id: string; title: string; when: string; date: string; time: string; location: string; past: boolean; people: number };

const MAX = 1000;

export function BroadcastComposer({ orgName, coordinator, audiences, events, sample, canDraft, initialEvent, initialAudience, initialTitle = '' }: {
  orgName: string;
  coordinator: string;
  audiences: Opt[];
  events: Ev[];
  sample: { first_name: string; hours: string };
  canDraft: boolean;
  initialEvent: string;
  initialAudience?: string;
  initialTitle?: string;
}) {
  const [sendState, send, sending] = useActionState(sendBroadcastAction, null);
  const [draft, askDraft, drafting] = useActionState(draftBroadcastAction, null);
  const [title, setTitle] = useState(initialTitle);
  const [audience, setAudience] = useState(initialAudience ?? audiences.find((a) => a.count > 0)?.key ?? 'all');
  const [eventId, setEventId] = useState(initialEvent);
  const [body, setBody] = useState('Hi {first_name}, ');
  const [note, setNote] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);

  // Take each new Claude draft into the editable fields once.
  const [taken, setTaken] = useState<number | undefined>();
  if (draft?.at && draft.at !== taken) {
    setTaken(draft.at);
    if (draft.body) setBody(draft.body);
    if (draft.title && !title) setTitle(draft.title);
  }

  const ev = events.find((e) => e.id === eventId);
  const eventAudiences: Opt[] = events.filter((e) => e.people > 0).map((e) => ({ key: `event:${e.id}`, label: `Everyone at ${e.title} · ${e.when}`, count: e.people }));
  const count = [...audiences, ...eventAudiences].find((a) => a.key === audience)?.count;
  const tokens = ['{first_name}', '{hours}', ...(ev ? ['{event}', '{date}', '{time}', '{location}'] : [])];
  const preview = useMemo(
    () =>
      body
        .replaceAll('{first_name}', sample.first_name)
        .replaceAll('{org}', orgName)
        .replaceAll('{hours}', sample.hours)
        .replaceAll('{event}', ev?.title ?? '{event}')
        .replaceAll('{date}', ev?.date ?? '{date}')
        .replaceAll('{time}', ev?.time ?? '{time}')
        .replaceAll('{location}', ev?.location ?? '{location}'),
    [body, ev, orgName, sample],
  );

  const insert = (t: string) => {
    const el = box.current;
    if (!el) return setBody((b) => b + t);
    const [a, z] = [el.selectionStart, el.selectionEnd];
    setBody((b) => b.slice(0, a) + t + b.slice(z));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + t.length, a + t.length);
    });
  };

  return (
    <div className={s.bGrid}>
      <form action={send} className="card card-pad stack" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="b-title">Name it</label>
          <input id="b-title" name="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Saturday cleanup reminder" maxLength={60} />
          <span className="hint">Only you see this. It labels the results.</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label htmlFor="b-aud">Send to</label>
            <select id="b-aud" name="audience" className="select" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <optgroup label="Volunteers">
                {audiences.map((a) => (
                  <option key={a.key} value={a.key} disabled={a.count === 0}>
                    {a.label} ({a.count})
                  </option>
                ))}
              </optgroup>
              {eventAudiences.length > 0 && (
                <optgroup label="Everyone at an event">
                  {eventAudiences.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label} ({a.count})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="field">
            <label htmlFor="b-ev">Invites them to</label>
            <select id="b-ev" name="event_id" className="select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">No event (a thank-you or news)</option>
              {events
                .filter((e) => !e.past)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {e.when}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {canDraft && (
          <div className="stack" style={{ gap: 8, padding: 12, borderRadius: 12, background: 'var(--primary-soft)' }}>
            <label htmlFor="b-note" className="small" style={{ fontWeight: 700 }}>
              Draft with Claude <span className="muted" style={{ fontWeight: 500 }}>(optional)</span>
            </label>
            <div className="row" style={{ gap: 8 }}>
              <input id="b-note" className="input" style={{ flex: 1, height: 38 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What do you want to say? e.g. we need 10 more people, bring gloves" />
              <button type="submit" formAction={askDraft} className="btn btn-sm" disabled={drafting}>
                {drafting ? 'Drafting…' : 'Draft it'}
              </button>
            </div>
            <input type="hidden" name="note" value={note} />
            {draft?.error && <p className="notice notice-red small">{draft.error}</p>}
            {draft?.flags && draft.flags.length > 0 && (
              <p className={s.flag}>
                Check {draft.flags.join(', ')}: {draft.flags.length === 1 ? 'that number isn’t' : 'those numbers aren’t'} in your event details. Edit the message before sending.
              </p>
            )}
          </div>
        )}

        <div className="field">
          <div className="row between">
            <label htmlFor="b-body">Message</label>
            <span className={s.count}>
              {body.length} / {MAX}
            </span>
          </div>
          <textarea ref={box} id="b-body" name="body" className="input" rows={5} value={body} maxLength={MAX} onChange={(e) => setBody(e.target.value)} />
          <div className={s.placeholders} aria-label="Insert a detail that fills in per person">
            {tokens.map((t) => (
              <button key={t} type="button" onClick={() => insert(t)}>
                {t}
              </button>
            ))}
          </div>
          <span className="hint">Details in braces fill in for each person from your verified records, so every number they read is right.</span>
        </div>

        {sendState?.error && <p className="notice notice-red small">{sendState.error}</p>}
        <div className="row between wrap">
          <span className="small muted">
            {count != null ? `Goes to ${count.toLocaleString()} ${count === 1 ? 'person' : 'people'} in their SycaMore app.` : 'Goes to everyone in that group, in their SycaMore app.'}
          </span>
          <button className="btn btn-primary" disabled={sending || !body.trim()}>
            {sending ? 'Sending…' : 'Send broadcast'}
          </button>
        </div>
      </form>

      <div className={s.phone} aria-label="Preview on a volunteer’s phone">
        <div className={s.screen}>
          <div className={s.phoneHead}>
            <span className="avatar">{orgName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{orgName}</div>
              <div className="small muted" style={{ fontSize: 11 }}>
                {coordinator} · in SycaMore
              </div>
            </div>
          </div>
          <div className={s.phoneNote}>Today</div>
          <div className={s.phoneBubble}>{preview || ' '}</div>
          <div className={s.phoneNote}>Shown as {sample.first_name} sees it</div>
        </div>
      </div>
    </div>
  );
}
