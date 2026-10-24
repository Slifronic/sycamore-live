'use client';

import { useActionState, useState } from 'react';
import { ACTIVITY_LABEL, type Activity } from '@/lib/types';
import type { IntakeDraft, IntakeSource } from '@/lib/intake-types';
import { appleDirections, googleDirections, mapEmbed, type Place } from '@/lib/place-links';
import type { FormState } from '@/app/org/actions';
import { IntakePanel, type RepeatOption } from './IntakePanel';
import { PlacePicker } from './PlacePicker';
import { TagInput, type TagOption } from './TagInput';
import s from './events.module.css';

const ACTIVITY_HINT: Record<Activity, string> = {
  general: 'Anything else',
  planting: 'Counts toward Urban Canopy Practitioner',
  logistics: 'Counts toward Resource Logistics Organizer',
  outreach: 'Tabling, canvassing, campaigns',
  education: 'Tutoring, mentoring, classes',
};

export type EventFormValues = {
  title: string;
  date: string;
  start: string;
  end: string;
  location: string;
  place: Place | null;
  notes: string;
  goal: string;
  activity: Activity;
  tags: string[];
  source: IntakeSource | 'manual';
  source_uid: string | null;
  use_for_site: boolean;
};

const fmtWhen = (date: string, start: string, end: string) => {
  if (!date) return 'Pick a date';
  const d = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const t = (v: string) => {
    if (!v) return '';
    const [h, m] = v.split(':').map(Number);
    return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
  };
  return `${d} · ${t(start)}${end ? ` to ${t(end)}` : ''}`;
};

export function EventForm({
  mode,
  action,
  initial,
  tagOptions,
  repeats = [],
  aiEnabled,
  orgName,
}: {
  mode: 'new' | 'edit';
  action: (state: FormState, form: FormData) => Promise<FormState>;
  initial: EventFormValues;
  tagOptions: TagOption[];
  repeats?: RepeatOption[];
  aiEnabled: boolean;
  orgName: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [v, setV] = useState<EventFormValues>(initial);
  const [from, setFrom] = useState<{ label: string; check: Set<string>; filled: Set<string>; warnings: string[] } | null>(null);
  const set = <K extends keyof EventFormValues>(k: K, val: EventFormValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const hl = (field: string) => (from?.check.has(field) ? s.checkThis : from?.filled.has(field) ? s.fromImport : '');

  function applyDraft(d: IntakeDraft) {
    const filled = new Set<string>();
    const next = { ...v };
    const put = <K extends keyof EventFormValues>(k: K, val: EventFormValues[K] | null | undefined, field: string = k) => {
      if (val === null || val === undefined || val === '') return;
      next[k] = val as EventFormValues[K];
      filled.add(field);
    };
    put('title', d.title);
    put('date', d.date);
    put('start', d.start);
    put('end', d.end);
    if (d.place) {
      next.place = d.place;
      next.location = d.place.name;
      filled.add('location');
    } else if (d.location) {
      next.place = null;
      next.location = d.location;
      filled.add('location');
    }
    put('notes', d.notes);
    put('goal', d.goal);
    put('activity', d.activity ?? undefined);
    if (d.tags.length) put('tags', d.tags);
    next.source = d.source;
    next.source_uid = d.source_uid;
    setV(next);
    setFrom({ label: d.source_label, check: new Set(d.check), filled, warnings: d.warnings });
  }

  const pinned = v.place;
  const directions = googleDirections({ name: v.place?.name ?? null, address: v.place?.address ?? null, lat: v.place?.lat, lng: v.place?.lng, text: v.location });
  const apple = appleDirections({ name: v.place?.name ?? null, address: v.place?.address ?? null, lat: v.place?.lat, lng: v.place?.lng, text: v.location });

  return (
    <div className={s.layout}>
      <div className="stack" style={{ gap: 16 }}>
        {mode === 'new' && <IntakePanel aiEnabled={aiEnabled} repeats={repeats} onDraft={applyDraft} onPlace={(p) => setV((x) => ({ ...x, place: p, location: p.name }))} />}

        {from && (
          <div className={s.filledBanner} role="status">
            <p>
              <strong>Filled in from {from.label.toLowerCase()}.</strong>{' '}
              {from.check.size > 0 ? <>Check the fields marked <span className={s.checkKey}>amber</span>; the rest came straight across.</> : 'Look it over, then create.'}
            </p>
            {from.warnings.map((w) => (
              <p key={w} className="small">
                {w}
              </p>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              onClick={() => {
                setV(initial);
                setFrom(null);
              }}
            >
              Start over
            </button>
          </div>
        )}

        <form action={formAction} className="card card-pad stack" style={{ gap: 18 }}>
          <input type="hidden" name="source" value={v.source} />
          <input type="hidden" name="source_uid" value={v.source_uid ?? ''} />
          <input type="hidden" name="place" value={v.place ? JSON.stringify(v.place) : ''} />

          <div className="field">
            <label htmlFor="title">Event name</label>
            <input className={`input ${hl('title')}`} id="title" name="title" value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Saturday Creek Planting" autoFocus={mode === 'new'} required />
          </div>

          <div className="row wrap" style={{ alignItems: 'start' }}>
            <div className="field" style={{ flex: '2 1 180px' }}>
              <label htmlFor="date">Date</label>
              <input className={`input ${hl('date')}`} id="date" name="date" type="date" value={v.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label htmlFor="start">Starts</label>
              <input className={`input ${hl('start')}`} id="start" name="start" type="time" value={v.start} onChange={(e) => set('start', e.target.value)} required />
            </div>
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label htmlFor="end">Ends</label>
              <input className={`input ${hl('end')}`} id="end" name="end" type="time" value={v.end} onChange={(e) => set('end', e.target.value)} required />
            </div>
          </div>
          {v.start && v.end && v.end <= v.start && <p className="small muted">Ends after midnight, on the next day.</p>}

          <div className="field">
            <label htmlFor="location">Where</label>
            <PlacePicker
              place={v.place}
              text={v.location}
              highlight={!!hl('location')}
              onText={(t) => setV((x) => ({ ...x, location: t }))}
              onPlace={(p) => setV((x) => ({ ...x, place: p, location: p?.name ?? x.location, use_for_site: p ? x.use_for_site : false }))}
            />
            {pinned && (
              <label className={s.checkRow}>
                <input type="checkbox" name="use_for_site" checked={v.use_for_site} onChange={(e) => set('use_for_site', e.target.checked)} />
                <span className="small">
                  Also use this pin for the <strong>leave-the-area check</strong> (suggests a check-out time when someone who opted in leaves). You can change the radius on the day.
                </span>
              </label>
            )}
          </div>

          <div className="field">
            <label htmlFor="notes">
              For volunteers <span className="muted small">(optional)</span>
            </label>
            <textarea className={`input ${hl('notes')}`} id="notes" name="notes" rows={2} value={v.notes} onChange={(e) => set('notes', e.target.value)} placeholder="What to bring or wear, parking, where to meet" />
            <span className="hint">Shows on the event page you share, and in the calendar invite.</span>
          </div>

          <div className="field">
            <label htmlFor="goal">
              Goal <span className="muted small">(optional)</span>
            </label>
            <input className={`input ${hl('goal')}`} id="goal" name="goal" value={v.goal} onChange={(e) => set('goal', e.target.value)} placeholder="e.g. Plant 40 trees, or sort 500 lbs of food" />
            <span className="hint">One concrete goal makes the post-event check easy, and it goes on your funder report.</span>
          </div>

          <div className="field">
            <span className={s.fieldLabel}>
              Tags <span className="muted small">(optional)</span>
            </span>
            <TagInput value={v.tags} onChange={(t) => set('tags', t)} options={tagOptions} highlight={!!hl('tags')} />
            <span className="hint">Group events by program, place or who they suit. Filter by them on Events and the calendar, and subscribe to one tag’s feed.</span>
          </div>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>What kind of work?</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
                <label key={a} className={`card ${s.tile} ${v.activity === a ? s.tileOn : ''}`}>
                  <input type="radio" name="activity" value={a} checked={v.activity === a} onChange={() => set('activity', a)} />
                  <span>
                    <strong className="small">{ACTIVITY_LABEL[a]}</strong>
                    <br />
                    <span className="small muted">{ACTIVITY_HINT[a]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {state?.error && (
            <p className="notice notice-red" role="alert">
              {state.error}
            </p>
          )}
          <div className="row wrap">
            <button className="btn btn-primary btn-big" disabled={pending}>
              {pending ? (mode === 'new' ? 'Creating…' : 'Saving…') : mode === 'new' ? 'Create event and get QR code' : 'Save changes'}
            </button>
            {mode === 'new' && <span className="small muted">You’ll get a check-in QR code and a link to share with volunteers.</span>}
          </div>
        </form>
      </div>

      <aside className={s.previewCol} aria-label="What volunteers will see">
        <p className="eyebrow">What volunteers see</p>
        <div className={`card ${s.preview}`}>
          {pinned ? (
            <iframe className={s.previewMap} title="Map preview" src={mapEmbed(pinned.lat, pinned.lng, 0.01)} loading="lazy" tabIndex={-1} />
          ) : (
            <div className={s.previewNoMap}>{v.location ? 'Pick a result to show a map' : 'No place yet'}</div>
          )}
          <div className={s.previewBody}>
            <p className="small muted">{orgName}</p>
            <h3 className={s.previewTitle}>{v.title || 'Event name'}</h3>
            <p className="small">{fmtWhen(v.date, v.start, v.end)}</p>
            {(v.place || v.location) && (
              <p className="small">
                📍 {v.place?.name ?? v.location}
                {v.place?.address && v.place.address !== v.place.name ? <span className="muted"> · {v.place.address}</span> : null}
              </p>
            )}
            {v.tags.length > 0 && (
              <div className="row wrap" style={{ gap: 6 }}>
                {v.tags.map((t) => (
                  <span key={t} className={`tag tag-${tagOptions.find((o) => o.name.toLowerCase() === t.toLowerCase())?.color ?? 'stone'}`}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            {v.notes && <p className={`small ${s.previewNotes}`}>{v.notes}</p>}
            <div className={s.previewButtons} aria-hidden>
              <span className={`btn btn-sm ${directions ? '' : s.dim}`}>Directions</span>
              {apple && <span className="btn btn-sm">Apple Maps</span>}
              <span className="btn btn-sm">Add to calendar</span>
            </div>
          </div>
        </div>
        <p className="small muted">After you create it, share one link in your group chats. It has the map, directions and add-to-calendar buttons. The check-in QR code stays with you.</p>
      </aside>
    </div>
  );
}
