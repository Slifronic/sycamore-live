'use client';

import { useRef, useState } from 'react';
import type { IntakeDraft, IntakeResult } from '@/lib/intake-types';
import type { Place } from '@/lib/place-links';
import { Icon } from '../shell/icons';
import { HelpTip } from '../media/HelpTip';
import s from './events.module.css';

export type RepeatOption = { label: string; draft: IntakeDraft };

// "Start from what you have": the fastest path into the form. One box takes
// a paste (invite text, a group-chat message, an "add to calendar" link, a
// calendar's iCal address, an event page, a maps link) or a dropped file (an
// .ics invite, the invite email, a flyer photo). Nothing is saved until the
// coordinator presses Create.
export function IntakePanel({
  aiEnabled,
  repeats,
  onDraft,
  onPlace,
}: {
  aiEnabled: boolean;
  repeats: RepeatOption[];
  onDraft: (d: IntakeDraft) => void;
  onPlace: (p: Place) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<{ drafts: IntakeDraft[]; note?: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  async function send(body: FormData, label: string) {
    setBusy(label);
    setError(null);
    setChoices(null);
    try {
      const res = await fetch('/api/org/intake', { method: 'POST', body });
      const data = (await res.json()) as IntakeResult;
      if (data.kind === 'error') setError(data.error);
      else if (data.kind === 'place') onPlace(data.place);
      else if (data.drafts.length === 1) {
        onDraft(data.drafts[0]);
        setText('');
      } else setChoices({ drafts: data.drafts, note: data.note });
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function sendFile(file: File) {
    let f = file;
    // Phone photos are big; shrink them on the device first (the long side to 1600px).
    if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.size > 1_500_000) {
      try {
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
        const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
        c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
        f = new File([await c.convertToBlob({ type: 'image/jpeg', quality: 0.85 })], 'photo.jpg', { type: 'image/jpeg' });
      } catch {
        /* send the original */
      }
    }
    const body = new FormData();
    body.set('file', f);
    send(body, f.type.startsWith('image/') ? 'Reading the photo…' : 'Reading the invite…');
  }

  function sendText(v = text) {
    if (!v.trim()) return;
    const body = new FormData();
    body.set('text', v);
    const isUrl = /^(https?|webcals?):\/\//i.test(v.trim());
    send(body, isUrl ? 'Opening the link…' : /BEGIN:VCALENDAR/i.test(v) ? 'Reading the invite…' : 'Reading it…');
  }

  return (
    <section
      className={`${s.intake} ${drag ? s.intakeDrag : ''}`}
      aria-labelledby="intake-title"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) sendFile(f);
        else {
          const t = e.dataTransfer.getData('text');
          if (t) {
            setText(t);
            sendText(t);
          }
        }
      }}
    >
      <div className="row between wrap" style={{ alignItems: 'center' }}>
        <h2 id="intake-title" style={{ fontSize: 17 }}>
          Start from what you already have
        </h2>
        <span className="small muted">Optional · nothing saves until you create</span>
      </div>

      <div className={s.intakeBox}>
        <textarea
          className="input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const f = e.clipboardData.files[0];
            if (f) {
              e.preventDefault();
              sendFile(f);
              return;
            }
            const v = e.clipboardData.getData('text');
            // A lone link or calendar text goes straight in; a message waits for the button.
            if (/^\s*((https?|webcals?):\/\/\S+|BEGIN:VCALENDAR[\s\S]*)\s*$/i.test(v)) {
              e.preventDefault();
              setText(v.trim());
              sendText(v.trim());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendText();
          }}
          placeholder={
            aiEnabled
              ? 'Paste an invite, a group-chat message, an event page or a calendar link. Or drop a file or photo here.'
              : 'Paste a calendar link, an event page or invite (.ics) text. Or drop an .ics file here.'
          }
          aria-label="Paste event details"
          disabled={!!busy}
        />
        <div className={s.intakeActions}>
          <button type="button" className="btn btn-primary" disabled={!!busy || !text.trim()} onClick={() => sendText()}>
            {busy ?? 'Fill in the form'}
          </button>
          <button type="button" className="btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            <Icon name="calendar" size={16} /> Invite (.ics)
          </button>
          {aiEnabled && (
            <button type="button" className="btn" disabled={!!busy} onClick={() => photoRef.current?.click()}>
              <Icon name="scan" size={16} /> Flyer or screenshot
            </button>
          )}
          {repeats.length > 0 && (
            <select
              className="select"
              style={{ width: 'auto', maxWidth: '100%', height: 40 }}
              aria-label="Repeat a past event"
              value=""
              disabled={!!busy}
              onChange={(e) => {
                const r = repeats[Number(e.target.value)];
                if (r) onDraft(r.draft);
              }}
            >
              <option value="">Repeat a past event…</option>
              {repeats.map((r, i) => (
                <option key={r.label} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".ics,.ical,.ifb,.vcs,.eml,text/calendar,message/rfc822"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendFile(f);
              e.target.value = '';
            }}
          />
          <input
            ref={photoRef}
            type="file"
            hidden
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {error && (
        <p className="notice notice-amber" role="alert">
          {error}
        </p>
      )}

      {choices && (
        <div className={s.choices}>
          <p className="small">
            <strong>{choices.drafts.length} events found.</strong> {choices.note ?? 'Pick the one to bring in.'}
          </p>
          <ul>
            {choices.drafts.map((d, i) => (
              <li key={`${d.source_uid ?? d.title}-${d.date}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    onDraft(d);
                    setChoices(null);
                    setText('');
                  }}
                >
                  <strong>{d.title}</strong>
                  <span className="small muted">
                    {d.date ? new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'No date'}
                    {d.start ? ` · ${d.start}` : ''}
                    {d.location ? ` · ${d.location}` : ''}
                  </span>
                  {d.warnings[0]?.startsWith('You already created') && <span className="chip chip-amber">Already added</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={s.howto}>
        <span className="small muted">Where’s my calendar’s iCal address?</span>
        <HelpTip label="Finding your calendar’s iCal address">
          <ul className={s.howtoList}>
            <li>
              <strong>Google:</strong> Settings, pick the calendar, Integrate calendar, “Secret address in iCal format”.
            </li>
            <li>
              <strong>Apple:</strong> right-click the calendar, Share Calendar, Public Calendar, copy the link.
            </li>
            <li>
              <strong>Outlook:</strong> Settings, Calendar, Shared calendars, Publish a calendar, ICS link.
            </li>
            <li>
              <strong>One invite:</strong> download the <code>invite.ics</code> attachment and drop it here.
            </li>
          </ul>
        </HelpTip>
      </div>
    </section>
  );
}
