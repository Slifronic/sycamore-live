'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Campaign, CampaignDraft, ClipDescription, NumberFlag, StoryFacts } from '@/lib/story';
import { Reel, type Shot } from '@/components/Reel';
import { Icon } from '@/components/shell/icons';
import { Chip } from '@/components/ui/Chip';
import { toast } from '@/components/shell/Toast';
import s from './story.module.css';

type Note = { id: string; transcript: string; source: 'voice' | 'typed'; audio_path: string | null; duration_s: number | null; created_at: string };
type Clip = {
  id: string;
  original_name: string | null;
  poster_path: string | null;
  size_bytes: number;
  duration_s: number | null;
  description: ClipDescription | null;
  caption: string | null;
  consent: boolean;
};
type CampaignState = Omit<Campaign, 'published_at' | 'updated_at'> & { published_at: string | null; updated_at: string };
type Initial = { notes: Note[]; clips: Clip[]; campaign: CampaignState | null; facts: StoryFacts; blockers: string[] };

const secs = (n: number | null) => (n == null ? '' : n >= 60 ? `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}` : `${Math.round(n)} s`);
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b > 10 * 1024 * 1024 ? 0 : 1)} MB`;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
  return data as T;
}

export function StoryStudio({ eventId, eventTitle, verified, aiEnabled, initial }: { eventId: string; eventTitle: string; verified: boolean; aiEnabled: boolean; initial: Initial }) {
  const [notes, setNotes] = useState(initial.notes);
  const [clips, setClips] = useState(initial.clips);
  const [campaign, setCampaign] = useState(initial.campaign);
  const base = `/api/org/events/${eventId}/story`;

  return (
    <div className={s.layout}>
      {!aiEnabled && (
        <p className="notice notice-amber">
          Voice notes and videos save without it, but Claude needs <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code> to describe clips and draft the campaign.
        </p>
      )}
      <section className="card" aria-labelledby="step-voice">
        <div className="card-head">
          <div>
            <p className="eyebrow eyebrow-sap">Step 1</p>
            <h2 id="step-voice" className={s.h2}>Tell what happened</h2>
          </div>
          <span className="chip chip-ink">{notes.length ? `${notes.length} note${notes.length === 1 ? '' : 's'}` : 'No notes yet'}</span>
        </div>
        <div className="card-pad stack">
          <p className="muted small">Like you’d tell your board: what got done, a moment that stuck, who stepped up (roles, not names), what’s next.</p>
          <VoiceRecorder base={base} onSaved={(n) => setNotes((ns) => [...ns, n])} />
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onDelete={async () => {
              await api(`${base}/notes/${n.id}`, { method: 'DELETE' });
              setNotes((ns) => ns.filter((x) => x.id !== n.id));
            }} />
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="step-video">
        <div className="card-head">
          <div>
            <p className="eyebrow eyebrow-sap">Step 2</p>
            <h2 id="step-video" className={s.h2}>Add the videos</h2>
          </div>
          <span className="chip chip-ink">
            {clips.length ? `${clips.length} clip${clips.length === 1 ? '' : 's'} · ${clips.filter((c) => c.consent).length} cleared to share` : 'No clips yet'}
          </span>
        </div>
        <div className="card-pad stack">
          <ClipUploader base={base} onAdded={(c) => setClips((cs) => [...cs, c])} />
          <div className={s.clipGrid}>
            {clips.map((c) => (
              <ClipCard
                key={c.id}
                clip={c}
                onChange={async (patch) => {
                  const { clip } = await api<{ clip: Clip }>(`${base}/clips/${c.id}`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(patch),
                  });
                  setClips((cs) => cs.map((x) => (x.id === c.id ? clip : x)));
                }}
                onDelete={async () => {
                  await api(`${base}/clips/${c.id}`, { method: 'DELETE' });
                  setClips((cs) => cs.filter((x) => x.id !== c.id));
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <CampaignPanel
        base={base}
        eventTitle={eventTitle}
        verified={verified}
        aiEnabled={aiEnabled}
        facts={initial.facts}
        hasInput={notes.length + clips.length > 0}
        clips={clips}
        campaign={campaign}
        setCampaign={setCampaign}
      />
    </div>
  );
}

// ---------- Step 1: voice debrief ----------

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const recognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noop = () => () => {};
const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

function VoiceRecorder({ base, onSaved }: { base: string; onSaved: (n: Note) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review'>('idle');
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [srBlocked, setSrBlocked] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const sr = useRef<Recognition | null>(null);
  const live = useRef(false);
  const finals = useRef('');
  const started = useRef(0);

  // Live transcription needs the browser's speech service (Chrome, Edge, Safari).
  const srSupported = useSyncExternalStore(noop, () => !!recognitionCtor(), () => true);
  const canTranscribe = srSupported && !srBlocked;
  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => setElapsed((Date.now() - started.current) / 1000), 250);
    return () => clearInterval(t);
  }, [phase]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = AUDIO_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setAudio(new Blob(chunks, { type: mr.mimeType || mimeType || 'audio/webm' }));
      };
      mr.start(1000);
      rec.current = mr;

      finals.current = text ? `${text.trim()} ` : '';
      const Ctor = recognitionCtor();
      if (Ctor) {
        const r = new Ctor();
        r.continuous = true;
        r.interimResults = true;
        r.lang = 'en-US';
        r.onresult = (e) => {
          let partial = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const piece = e.results[i][0].transcript;
            if (e.results[i].isFinal) finals.current += `${piece.trim()} `;
            else partial += piece;
          }
          setText(finals.current);
          setInterim(partial);
        };
        // Browsers end recognition after a pause; keep it going while recording.
        r.onend = () => {
          if (live.current) {
            try {
              r.start();
            } catch {}
          }
        };
        r.onerror = (e) => {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setSrBlocked(true);
        };
        r.start();
        sr.current = r;
      }
      live.current = true;
      started.current = Date.now();
      setElapsed(0);
      setPhase('recording');
    } catch {
      setError('The microphone isn’t available. Allow microphone access, or type your note below.');
      setPhase('review');
    }
  }

  function stop() {
    live.current = false;
    sr.current?.stop();
    rec.current?.stop();
    setInterim('');
    setPhase('review');
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('transcript', text.trim());
      if (audio) {
        body.append('audio', audio, audio.type.includes('mp4') ? 'note.m4a' : 'note.webm');
        body.append('duration_s', String(elapsed));
      }
      const { note } = await api<{ note: Note }>(`${base}/notes`, { method: 'POST', body });
      onSaved(note);
      setText('');
      setAudio(null);
      setElapsed(0);
      setPhase('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.recorder}>
      {phase === 'recording' ? (
        <div className={s.recRow}>
          <button type="button" className={`btn btn-big ${s.stop}`} onClick={stop}>
            <span className={s.recDot} aria-hidden /> Stop · {secs(elapsed)}
          </button>
          <span className="small muted">{canTranscribe ? 'Listening. Your words appear below as you talk.' : 'Recording. Type a summary after you stop.'}</span>
        </div>
      ) : (
        <div className={s.recRow}>
          <button type="button" className="btn btn-big btn-primary" onClick={start} disabled={busy}>
            <span className={s.micDot} aria-hidden /> {phase === 'review' ? 'Keep talking' : 'Record a voice note'}
          </button>
          {phase === 'idle' && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setPhase('review')}>
              Type instead
            </button>
          )}
        </div>
      )}
      {(phase !== 'idle' || text) && (
        <div className="field">
          <label htmlFor="debrief">What you said {phase === 'review' && <span className="muted small">(fix anything it misheard)</span>}</label>
          <textarea
            id="debrief"
            className="input"
            rows={5}
            value={phase === 'recording' && interim ? `${text}${interim}` : text}
            onChange={(e) => setText(e.target.value)}
            readOnly={phase === 'recording'}
            placeholder="We set out to plant 40 trees along the creek…"
          />
          {canTranscribe && <p className="hint">Live transcription uses your browser’s speech service. The recording itself stays with your organization.</p>}
        </div>
      )}
      {phase === 'review' && (
        <div className="row wrap">
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !text.trim()}>
            {busy ? 'Saving…' : 'Save note'}
          </button>
          {audioUrl && <audio controls src={audioUrl} className={s.audio} />}
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setPhase('idle'); setText(''); setAudio(null); }}>
            Discard
          </button>
        </div>
      )}
      {error && <p className="notice notice-red">{error}</p>}
    </div>
  );
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: () => Promise<void> }) {
  return (
    <article className={s.note}>
      <div className="row between wrap">
        <span className="small muted">
          {note.source === 'voice' ? 'Voice note' : 'Typed note'}
          {note.duration_s ? ` · ${secs(note.duration_s)}` : ''} ·{' '}
          {new Date(note.created_at).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' })}
        </span>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => confirm('Delete this note?') && onDelete()}>
          Delete
        </button>
      </div>
      <p className={s.noteText}>{note.transcript}</p>
      {note.audio_path && <audio controls preload="none" src={`/api/media/note/${note.id}`} className={s.audio} />}
    </article>
  );
}

// ---------- Step 2: video intake ----------

// Cut still frames from a video in the browser. Claude reads these, not the video.
async function cutFrames(file: File): Promise<{ duration: number | null; frames: Blob[]; times: number[] }> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  const once = (ev: string, ms = 15000) =>
    new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), ms);
      v.addEventListener(ev, () => (clearTimeout(t), res()), { once: true });
      v.addEventListener('error', () => (clearTimeout(t), rej(new Error('decode'))), { once: true });
    });
  try {
    await once('loadedmetadata');
    const duration = Number.isFinite(v.duration) ? v.duration : null;
    if (!duration) return { duration: null, frames: [], times: [] };
    const n = duration < 8 ? 3 : 6;
    const times = Array.from({ length: n }, (_, i) => Math.round(((duration * (i + 0.5)) / n) * 10) / 10);
    const canvas = document.createElement('canvas');
    const frames: Blob[] = [];
    for (const t of times) {
      v.currentTime = t;
      await once('seeked');
      const scale = Math.min(1, 768 / Math.max(v.videoWidth, v.videoHeight));
      canvas.width = Math.round(v.videoWidth * scale);
      canvas.height = Math.round(v.videoHeight * scale);
      canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
      frames.push(await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.8)));
    }
    return { duration, frames, times };
  } catch {
    // Some phone formats (HEVC .mov in some browsers) can't be decoded here; upload anyway.
    return { duration: null, frames: [], times: [] };
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Upload = { name: string; stage: 'reading' | 'uploading' | 'describing' | 'error'; pct: number; error?: string };

function ClipUploader({ base, onAdded }: { base: string; onAdded: (c: Clip) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const set = (name: string, patch: Partial<Upload>) => setUploads((us) => us.map((u) => (u.name === name ? { ...u, ...patch } : u)));

  async function one(file: File) {
    set(file.name, { stage: 'reading' });
    const { duration, frames, times } = await cutFrames(file);
    const body = new FormData();
    body.append('video', file, file.name);
    frames.forEach((f, i) => body.append('frames', f, `frame-${i}.jpg`));
    body.append('frame_times', JSON.stringify(times));
    if (frames.length) body.append('poster', frames[Math.min(1, frames.length - 1)], 'poster.jpg');
    if (duration) body.append('duration_s', String(duration));
    set(file.name, { stage: 'uploading', pct: 0 });
    // XHR rather than fetch, so a 200 MB video shows upload progress.
    const data = await new Promise<{ clip?: Clip; error?: string }>((res) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/clips`);
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((100 * e.loaded) / e.total);
        set(file.name, pct >= 100 ? { stage: 'describing', pct } : { pct });
      };
      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText);
          res(xhr.status < 300 ? parsed : { error: parsed.error ?? 'Upload failed.' });
        } catch {
          res({ error: 'Upload failed.' });
        }
      };
      xhr.onerror = () => res({ error: 'The connection dropped. Try again.' });
      xhr.send(body);
    });
    if (data.clip) {
      onAdded(data.clip);
      setUploads((us) => us.filter((u) => u.name !== file.name));
    } else set(file.name, { stage: 'error', error: data.error });
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list);
    setUploads((us) => [...us.filter((u) => u.stage !== 'error'), ...files.map((f) => ({ name: f.name, stage: 'reading' as const, pct: 0 }))]);
    for (const f of files) await one(f);
    if (input.current) input.current.value = '';
  }

  const label: Record<Upload['stage'], string> = {
    reading: 'Reading frames…',
    uploading: 'Uploading',
    describing: 'Claude is watching the frames…',
    error: 'Didn’t upload',
  };

  return (
    <div className="stack">
      <label className={s.drop}>
        <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        <span className={s.dropIcon} aria-hidden>
          <Icon name="plus" size={20} />
        </span>
        <span>
          <strong>Add videos from the event</strong>
          <br />
          <span className="small muted">MP4, MOV or WebM, up to 300 MB. Claude reads a few still frames, never the video.</span>
        </span>
      </label>
      {uploads.map((u) => (
        <div key={u.name} className={s.upload} role="status">
          <div className="row between">
            <span className="small" style={{ fontWeight: 600 }}>{u.name}</span>
            <span className="small muted">{label[u.stage]}{u.stage === 'uploading' ? ` ${u.pct}%` : ''}</span>
          </div>
          {u.stage === 'error' ? <p className="small" style={{ color: 'var(--red)' }}>{u.error}</p> : (
            <span className="bar"><span style={{ width: `${u.stage === 'reading' ? 4 : u.stage === 'describing' ? 100 : u.pct}%` }} /></span>
          )}
        </div>
      ))}
    </div>
  );
}

function ClipCard({ clip, onChange, onDelete }: { clip: Clip; onChange: (p: { caption?: string; consent?: boolean }) => Promise<void>; onDelete: () => Promise<void> }) {
  const [caption, setCaption] = useState(clip.caption ?? '');
  const [error, setError] = useState<string | null>(null);
  const d = clip.description;
  const run = (p: Promise<void>) => p.catch((e) => setError(e instanceof Error ? e.message : String(e)));
  return (
    <article className={s.clip}>
      <video
        className={s.clipVideo}
        controls
        preload="metadata"
        playsInline
        poster={clip.poster_path ? `/api/media/clip/${clip.id}/poster` : undefined}
        src={`/api/media/clip/${clip.id}/video`}
      />
      <div className={s.clipBody}>
        <div className="row wrap" style={{ gap: 6 }}>
          {clip.duration_s && <span className="chip chip-ink">{secs(clip.duration_s)}</span>}
          <span className="chip chip-ink">{mb(clip.size_bytes)}</span>
          {d?.people_visible && <span className="chip chip-amber">People recognizable</span>}
          {d?.minors_possible && <span className="chip chip-amber">May include minors</span>}
          {d && d.quality !== 'good' && <span className="chip chip-ink">{d.quality}</span>}
        </div>
        {d ? (
          <>
            <p className="small">{d.summary}</p>
            {d.moments.length > 0 && (
              <ul className={s.moments}>
                {d.moments.map((m, i) => (
                  <li key={i} className="small"><span className="num muted">{secs(m.at_s)}</span> {m.what}</li>
                ))}
              </ul>
            )}
            {d.notes && <p className="small" style={{ color: 'var(--amber)' }}>Check before sharing: {d.notes}</p>}
          </>
        ) : (
          <p className="small muted">Not described (no frames could be read, or Claude isn’t set up). Add a caption yourself.</p>
        )}
        <div className="field">
          <label htmlFor={`cap-${clip.id}`} className="small">Caption</label>
          <input
            id={`cap-${clip.id}`}
            className="input"
            value={caption}
            maxLength={140}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => caption !== (clip.caption ?? '') && run(onChange({ caption }))}
          />
        </div>
        <label className={s.consent}>
          <input type="checkbox" checked={clip.consent} onChange={(e) => run(onChange({ consent: e.target.checked }))} />
          <span className="small">
            Everyone recognizable agreed to be filmed and shared{d?.minors_possible ? ', and a guardian agreed for anyone under 18' : ''}. Only checked clips can go on the public page.
          </span>
        </label>
        <div className="row between">
          <span className="small muted">{clip.original_name}</span>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => confirm('Delete this clip?') && run(onDelete())}>Delete</button>
        </div>
        {error && <p className="notice notice-red">{error}</p>}
      </div>
    </article>
  );
}

// ---------- Step 3: the campaign ----------

const FIELDS: { key: keyof Omit<CampaignDraft, 'social' | 'hashtags' | 'storyboard'>; label: string; rows: number; hint?: string }[] = [
  { key: 'headline', label: 'Headline', rows: 1 },
  { key: 'subhead', label: 'Subhead', rows: 2 },
  { key: 'story', label: 'Story', rows: 8 },
  { key: 'quote', label: 'Pull quote', rows: 2, hint: 'Must be your exact words from a note. If you change it so it no longer matches, it’s removed when you save.' },
  { key: 'funder_paragraph', label: 'For your grant report', rows: 4 },
  { key: 'thank_you', label: 'Thank-you to volunteers', rows: 3 },
  { key: 'call_to_action', label: 'Call to action', rows: 2 },
];
const SOCIAL: { key: keyof CampaignDraft['social']; label: string; limit?: number }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X', limit: 280 },
];

function markdownKit(d: CampaignDraft, f: StoryFacts, url: string | null) {
  const lines = [
    `# ${d.headline}`, '', d.subhead, '',
    `**Verified record:** ${f.volunteers} volunteers · ${f.verified_hours} hours · ${f.event.title}, ${f.event.date}${f.verified_on ? ` (verified ${f.verified_on})` : ''}`,
    url ? `**Campaign page:** ${url}` : '', '',
    '## Story', '', d.story, '',
    d.quote ? `> “${d.quote}”\n> ${f.org.coordinator}, ${f.org.name}\n` : '',
    '## For the grant report', '', d.funder_paragraph, '',
    '## Thank-you to volunteers', '', d.thank_you, '',
    '## Social', '', '### Instagram', '', d.social.instagram, '', '### LinkedIn', '', d.social.linkedin, '', '### X', '', d.social.x, '',
    d.hashtags.join(' '), '',
    '## Highlight reel', '',
    ...d.storyboard.map((sh, i) => `${i + 1}. ${sh.caption} (clip ${sh.clip_id.slice(0, 8)}, ${sh.start_s}–${sh.end_s} s)`), '',
    `_${d.call_to_action}_`,
  ];
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

function CampaignPanel({
  base, eventTitle, verified, aiEnabled, facts, hasInput, clips, campaign, setCampaign,
}: {
  base: string; eventTitle: string; verified: boolean; aiEnabled: boolean; facts: StoryFacts; hasInput: boolean; clips: Clip[];
  campaign: CampaignState | null; setCampaign: (c: CampaignState) => void;
}) {
  const [draft, setDraft] = useState<CampaignDraft | null>(campaign?.draft ?? null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const flags: NumberFlag[] = campaign?.flags ?? [];
  const shownFacts = campaign?.facts ?? facts;
  const publicUrl = campaign?.slug ? `${typeof window === 'undefined' ? '' : window.location.origin}/c/${campaign.slug}` : null;

  const edit = (patch: Partial<CampaignDraft>) => {
    setDraft((d) => ({ ...d!, ...patch }));
    setDirty(true);
  };
  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const generate = () =>
    act('generate', async () => {
      if (dirty && !confirm('Redrafting replaces your edits. Continue?')) return;
      const { campaign: c } = await api<{ campaign: CampaignState }>(`${base}/campaign`, { method: 'POST' });
      setCampaign(c);
      setDraft(c.draft);
      setDirty(false);
    });
  const save = () =>
    act('save', async () => {
      const { campaign: c } = await api<{ campaign: CampaignState }>(`${base}/campaign`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      setCampaign(c);
      setDraft(c.draft);
      setDirty(false);
      toast.success(c.flags?.length ? 'Saved, with numbers to check' : 'Edits saved');
    });
  const publish = (on: boolean) =>
    act('publish', async () => {
      const { campaign: c } = await api<{ campaign: CampaignState }>(`${base}/campaign/publish`, { method: on ? 'POST' : 'DELETE' });
      setCampaign(c);
      if (on) toast.success('Campaign page published', { action: c.slug ? { label: 'Open', href: `/c/${c.slug}` } : undefined });
      else toast('Campaign page taken down');
    });
  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(key === 'url' ? 'Link copied' : 'Post copied');
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  const download = () => {
    const blob = new Blob([markdownKit(draft!, shownFacts, publicUrl)], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-campaign.md`;
    a.click();
  };

  const clipById = new Map(clips.map((c) => [c.id, c]));
  const shots: Shot[] = (draft?.storyboard ?? [])
    .filter((sh) => clipById.get(sh.clip_id)?.consent)
    .map((sh) => ({
      src: `/api/media/clip/${sh.clip_id}/video`,
      poster: clipById.get(sh.clip_id)?.poster_path ? `/api/media/clip/${sh.clip_id}/poster` : null,
      start: sh.start_s,
      end: sh.end_s,
      caption: sh.caption,
    }));
  const flagFor = (label: string) => flags.filter((f) => f.field === label);
  const blockers = [
    !verified && 'Verify the event first, so the numbers on the public page are attested.',
    draft && (!draft.headline.trim() || !draft.story.trim()) && 'The headline and story can’t be empty.',
    flags.length > 0 && `${flags.length === 1 ? 'One number isn’t' : `${flags.length} numbers aren’t`} in the verified record or your debrief.`,
    dirty && 'Save your edits first.',
  ].filter(Boolean) as string[];
  const live = campaign?.status === 'published';

  return (
    <section className="card" aria-labelledby="step-campaign">
      <div className="card-head">
        <div>
          <p className="eyebrow eyebrow-sap">Step 3</p>
          <h2 id="step-campaign" className={s.h2}>Package it into a campaign</h2>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {live && (
            <Chip tone="green" icon="live">
              Published
            </Chip>
          )}
          <button type="button" className={draft ? 'btn' : 'btn btn-primary btn-big'} onClick={generate} disabled={!hasInput || !aiEnabled || !!busy}>
            {busy === 'generate' ? 'Claude is drafting…' : draft ? 'Redraft with Claude' : 'Draft the campaign with Claude'}
          </button>
        </div>
      </div>
      <div className="card-pad stack">
        <div className={s.facts}>
          <p className="eyebrow">{shownFacts.verified ? 'From your verified record' : 'From your record (not verified yet)'}</p>
          <ul className={s.factList}>
            <li><strong className="num">{shownFacts.volunteers}</strong> volunteers</li>
            <li><strong className="num">{shownFacts.verified_hours}</strong> hours</li>
            {shownFacts.first_timers > 0 && <li><strong className="num">{shownFacts.first_timers}</strong> first-timers</li>}
            {shownFacts.leaders > 0 && <li><strong className="num">{shownFacts.leaders}</strong> in lead roles</li>}
            <li><strong className="num">${shownFacts.volunteer_value_usd.toLocaleString()}</strong> of volunteer time at ${shownFacts.rate.usd}/hr ({shownFacts.rate.label})</li>
          </ul>
          <p className="small muted">Claude may only use these and the numbers in your notes. Anything else gets flagged.</p>
        </div>

        {!hasInput && <p className="muted">Record a note or add a video first. Claude writes from what you tell it.</p>}
        {error && <p className="notice notice-red">{error}</p>}
        {flags.length > 0 && (
          <div className="notice notice-amber" role="alert">
            <strong>Check these numbers.</strong> They aren’t in your verified record or your notes, so the campaign can’t be published until you fix or remove them:
            <ul className={s.flagList}>
              {flags.map((f, i) => <li key={i}>“{f.value}” in {f.field}</li>)}
            </ul>
          </div>
        )}

        {draft && (
          <>
            {shots.length > 0 ? (
              <Reel shots={shots} />
            ) : (
              <p className="small muted">No highlight reel yet: tick the consent box on the clips you can share, then redraft.</p>
            )}

            <div className={s.editor}>
              {FIELDS.map((f) => (
                <div key={f.key} className="field">
                  <label htmlFor={`f-${f.key}`}>{f.label}</label>
                  <textarea
                    id={`f-${f.key}`}
                    className={`input ${flagFor(FIELD_LABEL[f.key]).length ? s.flagged : ''}`}
                    rows={f.rows}
                    value={draft[f.key]}
                    onChange={(e) => edit({ [f.key]: e.target.value } as Partial<CampaignDraft>)}
                  />
                  {f.hint && <p className="hint">{f.hint}</p>}
                </div>
              ))}
            </div>

            <div className={s.socialGrid}>
              {SOCIAL.map((p) => {
                const text = `${draft.social[p.key]}${p.key === 'x' ? '' : `\n\n${draft.hashtags.join(' ')}`}`;
                const over = p.limit && draft.social[p.key].length > p.limit;
                return (
                  <div key={p.key} className={s.post}>
                    <div className="row between">
                      <strong className="small">{p.label}</strong>
                      <button type="button" className="btn btn-sm" onClick={() => copy(p.key, text)}>{copied === p.key ? 'Copied' : 'Copy'}</button>
                    </div>
                    <textarea
                      className={`input ${flagFor(p.label).length || over ? s.flagged : ''}`}
                      rows={p.key === 'x' ? 4 : 7}
                      value={draft.social[p.key]}
                      onChange={(e) => edit({ social: { ...draft.social, [p.key]: e.target.value } })}
                      aria-label={`${p.label} post`}
                    />
                    {p.limit && <span className={`small num ${over ? '' : 'muted'}`} style={over ? { color: 'var(--red)' } : undefined}>{draft.social[p.key].length} / {p.limit}</span>}
                  </div>
                );
              })}
            </div>
            <div className="field">
              <label htmlFor="tags">Hashtags</label>
              <input id="tags" className="input" value={draft.hashtags.join(' ')} onChange={(e) => edit({ hashtags: e.target.value.split(/[\s,]+/).filter(Boolean) })} />
            </div>

            {draft.storyboard.length > 0 && (
              <div className="stack">
                <p className="eyebrow">Highlight reel shots</p>
                {draft.storyboard.map((sh, i) => {
                  const c = clipById.get(sh.clip_id);
                  const set = (patch: Partial<typeof sh>) => edit({ storyboard: draft.storyboard.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                  const move = (dir: -1 | 1) => {
                    const next = [...draft.storyboard];
                    [next[i], next[i + dir]] = [next[i + dir], next[i]];
                    edit({ storyboard: next });
                  };
                  return (
                    <div key={i} className={s.shot}>
                      {c?.poster_path ? <img src={`/api/media/clip/${c.id}/poster`} alt="" className={s.thumb} /> : <span className={s.thumb} />}
                      <input className={`input ${flagFor(`Shot ${i + 1} caption`).length ? s.flagged : ''}`} value={sh.caption} onChange={(e) => set({ caption: e.target.value })} aria-label={`Shot ${i + 1} caption`} />
                      <span className="row" style={{ gap: 4 }}>
                        <input className={`input num ${s.sec}`} type="number" step="0.5" min={0} value={sh.start_s} onChange={(e) => set({ start_s: Number(e.target.value) })} aria-label="Start, seconds" />
                        <span className="muted">–</span>
                        <input className={`input num ${s.sec}`} type="number" step="0.5" min={0} value={sh.end_s} onChange={(e) => set({ end_s: Number(e.target.value) })} aria-label="End, seconds" />
                      </span>
                      {!c?.consent && <span className="chip chip-amber">Not cleared</span>}
                      <span className="row" style={{ gap: 2 }}>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(-1)} disabled={i === 0} aria-label="Move up"><Icon name="chevron-down" size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(1)} disabled={i === draft.storyboard.length - 1} aria-label="Move down"><Icon name="chevron-down" size={16} /></button>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => edit({ storyboard: draft.storyboard.filter((_, j) => j !== i) })} aria-label="Remove shot"><Icon name="x" size={16} /></button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={s.actions}>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || !!busy}>
                {busy === 'save' ? 'Checking…' : dirty ? 'Save edits' : 'Saved'}
              </button>
              <button type="button" className="btn" onClick={download}>Download kit (.md)</button>
              <span className={s.spacer} />
              {live ? (
                <>
                  <a className="btn" href={`/c/${campaign!.slug}`} target="_blank" rel="noreferrer">Open public page <Icon name="arrow-up-right" size={16} /></a>
                  {publicUrl && <button type="button" className="btn btn-sm" onClick={() => copy('url', publicUrl)}>{copied === 'url' ? 'Copied' : 'Copy link'}</button>}
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => publish(false)} disabled={!!busy}>Unpublish</button>
                </>
              ) : (
                <button type="button" className="btn btn-big btn-primary" onClick={() => publish(true)} disabled={blockers.length > 0 || !!busy} title={blockers[0]}>
                  {busy === 'publish' ? 'Publishing…' : 'Publish campaign page'}
                </button>
              )}
            </div>
            {!live && blockers.length > 0 && <p className="small muted">{blockers[0]}</p>}
            {live && dirty && <p className="small muted">Save to update the public page.</p>}
          </>
        )}
      </div>
    </section>
  );
}

const FIELD_LABEL: Record<(typeof FIELDS)[number]['key'], string> = {
  headline: 'Headline',
  subhead: 'Subhead',
  story: 'Story',
  quote: 'Quote',
  funder_paragraph: 'Funder paragraph',
  thank_you: 'Thank-you',
  call_to_action: 'Call to action',
};
