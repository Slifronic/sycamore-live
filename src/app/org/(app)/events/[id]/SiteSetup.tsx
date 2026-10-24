'use client';

import { useState } from 'react';
import s from './event.module.css';

type Site = { lat: number | null; lng: number | null; radius_m: number };
const RADII = [100, 200, 400, 800];

// Leave-the-area check: the coordinator stands at the site and taps once.
export function SiteSetup({ eventId, initial }: { eventId: string; initial: Site }) {
  const [site, setSite] = useState<Site>(initial);
  const [radius, setRadius] = useState(initial.radius_m);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const on = site.lat != null && site.lng != null;

  async function save(lat: number, lng: number, r = radius, accuracy?: number) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/org/events/${eventId}/site`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat, lng, radius_m: r }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setSite(data.site);
    setNote(accuracy != null ? `Location set (accurate to about ${Math.round(accuracy)} m).` : 'Location set.');
  }

  function useHere() {
    if (!navigator.geolocation) return setError('This browser can’t share its location. Paste coordinates instead.');
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => save(p.coords.latitude, p.coords.longitude, radius, p.coords.accuracy),
      (e) => {
        setBusy(false);
        setError(e.code === e.PERMISSION_DENIED ? 'Location permission was denied. Allow it in the browser, or paste coordinates.' : 'Couldn’t get a location fix. Try again outside, or paste coordinates.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function useManual() {
    const m = manual.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return setError('Paste coordinates like “37.3012, -121.8601” (from Google Maps: right-click the spot).');
    save(Number(m[1]), Number(m[2]));
  }

  async function turnOff() {
    setBusy(true);
    const res = await fetch(`/api/org/events/${eventId}/site`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setSite((x) => ({ ...x, lat: null, lng: null }));
      setNote('Leave-the-area check is off.');
    }
  }

  return (
    <section className={`card ${s.site}`} aria-labelledby="site-h">
      <div className="card-head">
        <div>
          <p className="eyebrow">Leave-the-area check · optional</p>
          <h2 id="site-h" className={s.siteTitle}>
            {on ? `On: ${site.radius_m} m around the site` : 'Suggest check-outs for people who leave'}
          </h2>
        </div>
        {on && <span className="chip chip-green">● On</span>}
      </div>
      <div className="card-pad stack">
        <p className="small muted">
          Volunteers who opt in on their phone get a “Looks like you’ve left. Check out?” prompt after 10 minutes outside this circle, and you see a
          suggested check-out time when you verify. Nobody is checked out automatically, no location history is kept, and the suggestion is deleted
          once the event is verified. Phones only report while the check-in page is open.
        </p>
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>Radius</span>
          <div className="seg" role="group" aria-label="Radius">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                className={`seg-item ${s.segBtn} ${radius === r ? s.segOn : ''}`}
                aria-pressed={radius === r}
                onClick={() => {
                  setRadius(r);
                  if (on) save(site.lat!, site.lng!, r);
                }}
              >
                {r} m
              </button>
            ))}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={useHere} disabled={busy}>
            📍 {on ? 'Re-center on where I am' : 'Use where I’m standing'}
          </button>
          <span className="small muted">or</span>
          <input
            className="input"
            style={{ maxWidth: 240, height: 40 }}
            placeholder="37.3012, -121.8601"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            aria-label="Site coordinates"
          />
          <button type="button" className="btn" onClick={useManual} disabled={busy || !manual.trim()}>
            Set
          </button>
          {on && (
            <>
              <a className="btn btn-quiet btn-sm" href={`https://www.google.com/maps?q=${site.lat},${site.lng}`} target="_blank" rel="noreferrer">
                Check on map ↗
              </a>
              <button type="button" className="btn btn-quiet btn-sm" onClick={turnOff} disabled={busy}>
                Turn off
              </button>
            </>
          )}
        </div>
        {note && !error && <p className="small" style={{ color: 'var(--verified)' }} role="status">{note}</p>}
        {error && <p className="notice notice-red">{error}</p>}
      </div>
    </section>
  );
}
