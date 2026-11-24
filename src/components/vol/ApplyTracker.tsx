'use client';

import { useState } from 'react';
import { toast } from '@/components/shell/Toast';
import { APPLICATION_LABEL, APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/impact-rules';
import s from './apply.module.css';

type App = { id: string; status: ApplicationStatus; applied_at: string };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' });

// "I applied" under a public listing's outbound button. The volunteer keeps
// track of where they applied and how it went; the team sees the counts on
// /impact as self-reported. SycaMore can't check it, and this says so.
export function ApplyTracker({ slug, orgName, signedIn, initial, compact = false }: { slug: string; orgName: string; signedIn: boolean; initial: App | null; compact?: boolean }) {
  const [app, setApp] = useState<App | null>(initial);
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <p className={s.line}>
        Applied? <a href={`/join?next=${encodeURIComponent(`/opportunities/${slug}`)}`}>Sign in</a> to keep track of it next to your SycaMore hours.
      </p>
    );
  }

  async function send(method: 'POST' | 'PATCH', body: object) {
    setBusy(true);
    try {
      const r = await fetch('/api/vol/applications', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? 'That didn’t save. Try again.');
      setApp(j.application);
      return j.application as App;
    } catch (e) {
      toast({ title: (e as Error).message, tone: 'error' });
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (!app) {
    return (
      <div className={s.box}>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={async () => {
            if (await send('POST', { slug })) toast({ title: 'Marked as applied', body: 'Update it in My hours when you hear back.', tone: 'success' });
          }}
        >
          I applied
        </button>
        <span className={s.note}>Keeps a note in your account that you applied to {orgName}.</span>
      </div>
    );
  }

  return (
    <div className={s.box}>
      <span className={`chip ${app.status === 'withdrawn' ? 'chip-ink' : 'chip-green'}`}>
        {APPLICATION_LABEL[app.status]} · {day(app.applied_at)}
      </span>
      <label className={s.status}>
        <span>Update</span>
        <select
          className="select"
          value={app.status}
          disabled={busy}
          onChange={(e) => void send('PATCH', { id: app.id, status: e.target.value })}
          aria-label={`Where your application to ${orgName} stands`}
        >
          {APPLICATION_STATUSES.map((st) => (
            <option key={st} value={st}>
              {APPLICATION_LABEL[st]}
            </option>
          ))}
        </select>
      </label>
      {!compact && <span className={s.note}>Your own word: {orgName} doesn’t report back to SycaMore.</span>}
    </div>
  );
}
