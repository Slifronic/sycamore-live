'use client';

import { useActionState } from 'react';
import { newEvent } from '../../../actions';
import { ACTIVITY_LABEL, type Activity } from '@/lib/types';

const ACTIVITY_HINT: Record<Activity, string> = {
  general: 'Anything else',
  planting: 'Counts toward Urban Canopy Practitioner',
  logistics: 'Counts toward Resource Logistics Organizer',
  outreach: 'Tabling, canvassing, campaigns',
  education: 'Tutoring, mentoring, classes',
};

export function NewEventForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(newEvent, null);
  return (
    <form action={action} className="card card-pad stack" style={{ gap: 18 }}>
      <div className="field">
        <label htmlFor="title">Event name</label>
        <input className="input" id="title" name="title" placeholder="e.g. Saturday Creek Planting" autoFocus required />
      </div>
      <div className="field">
        <label htmlFor="location">Where</label>
        <input className="input" id="location" name="location" placeholder="Park, address or “Remote”" />
      </div>
      <div className="field">
        <label htmlFor="goal">
          Goal <span className="muted small">(optional)</span>
        </label>
        <input className="input" id="goal" name="goal" placeholder="e.g. Plant 40 trees, or sort 500 lbs of food" />
        <span className="hint">One concrete goal makes the post-event check easy, and it goes on your funder report.</span>
      </div>
      <div className="row wrap" style={{ alignItems: 'start' }}>
        <div className="field" style={{ flex: '2 1 180px' }}>
          <label htmlFor="date">Date</label>
          <input className="input" id="date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="field" style={{ flex: '1 1 120px' }}>
          <label htmlFor="start">Starts</label>
          <input className="input" id="start" name="start" type="time" defaultValue="09:00" required />
        </div>
        <div className="field" style={{ flex: '1 1 120px' }}>
          <label htmlFor="end">Ends</label>
          <input className="input" id="end" name="end" type="time" defaultValue="12:00" required />
        </div>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>What kind of work?</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
            <label key={a} className="card" style={{ padding: '10px 12px', display: 'flex', gap: 10, cursor: 'pointer', boxShadow: 'none' }}>
              <input type="radio" name="activity" value={a} defaultChecked={a === 'general'} />
              <span>
                <strong className="small">{ACTIVITY_LABEL[a]}</strong>
                <br />
                <span className="small muted">{ACTIVITY_HINT[a]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && <p className="notice notice-red">{state.error}</p>}
      <div className="row">
        <button className="btn btn-primary btn-big" disabled={pending}>
          {pending ? 'Creating…' : 'Create event and get QR code'}
        </button>
      </div>
    </form>
  );
}
