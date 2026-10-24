'use client';

import { useId, useState } from 'react';

// "Use this record": a resume line or a scholarship sentence, drafted from the
// attested record. The server checks every number against the record; the
// volunteer edits the words here and copies them. Nothing is saved.
export function BlurbPanel({ recordId, orgName }: { recordId: string; orgName: string }) {
  const id = useId();
  const [busy, setBusy] = useState<null | 'resume' | 'scholarship'>(null);
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const draft = async (kind: 'resume' | 'scholarship') => {
    setBusy(kind);
    setError('');
    const res = await fetch(`/api/vol/records/${recordId}/blurb`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(null);
    if (!res?.ok || !data?.text) return setError(data?.error ?? 'No connection. Try again.');
    setText(data.text);
    setSource(data.source);
  };

  return (
    <section className="card card-pad stack">
      <h3>Use this record</h3>
      <p className="small muted">A line for a resume or a sentence for a scholarship essay, written from this record’s facts.</p>
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btn" disabled={!!busy} onClick={() => draft('resume')}>
          {busy === 'resume' ? 'Writing (up to 30 s)…' : 'Resume line'}
        </button>
        <button type="button" className="btn" disabled={!!busy} onClick={() => draft('scholarship')}>
          {busy === 'scholarship' ? 'Writing (up to 30 s)…' : 'Scholarship sentence'}
        </button>
      </div>
      {text && (
        <>
          <div className="field">
            <label htmlFor={id}>Your draft</label>
            <textarea id={id} className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              await navigator.clipboard.writeText(text).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <p className="small muted">
            Hours from {orgName}’s attested record. {source === 'template' ? 'This wording is a plain template; edit it before you use it.' : 'The wording is AI-drafted; edit it before you use it.'}
          </p>
        </>
      )}
      {error && (
        <p className="notice notice-red small" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
