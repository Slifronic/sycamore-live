'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { mapEmbed, type Place } from '@/lib/place-links';
import { Icon } from '../shell/icons';
import s from './events.module.css';

// Where the event is. Type a place or an address and pick a result, paste a
// Google or Apple Maps link, or use where you're standing. Typed text that
// never gets a pin still saves, as plain text.

const looksLikeLink = (v: string) => /^https?:\/\/\S+$/i.test(v.trim()) || /^-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}$/.test(v.trim());

export function PlacePicker({
  place,
  text,
  onPlace,
  onText,
  highlight,
}: {
  place: Place | null;
  text: string;
  onPlace: (p: Place | null) => void;
  onText: (t: string) => void;
  highlight?: boolean;
}) {
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  async function lookup(q: string, pickFirst = false) {
    const n = ++seq.current;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/places?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { places: Place[]; resolved?: boolean; error?: string };
      if (n !== seq.current) return;
      if (data.error) setError(data.error);
      if ((pickFirst || data.resolved) && data.places[0]) {
        onPlace(data.places[0]);
        setOpen(false);
        return;
      }
      setResults(data.places);
      setActive(0);
      setOpen(true);
    } catch {
      if (n === seq.current) setError('Map search isn’t reachable. The typed place still saves.');
    } finally {
      if (n === seq.current) setBusy(false);
    }
  }

  // Search as the coordinator types, after a pause. Links resolve right away (see onPaste).
  useEffect(() => {
    if (place || text.trim().length < 3 || looksLikeLink(text)) return;
    const t = setTimeout(() => lookup(text), 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, place]);

  function useHere() {
    if (!navigator.geolocation) return setError('This browser can’t share its location.');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => lookup(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`, true),
      () => {
        setBusy(false);
        setError('Location is off for this site. Type the place instead.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  if (place) {
    return (
      <div className={`${s.placeCard} ${highlight ? s.fromImport : ''}`}>
        <iframe className={s.placeMap} title={`Map of ${place.name}`} src={mapEmbed(place.lat, place.lng)} loading="lazy" />
        <div className={s.placeBody}>
          <div>
            <strong>{place.name}</strong>
            {place.address && place.address !== place.name && <p className="small muted">{place.address}</p>}
            <p className="small muted">
              Pinned at {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
              {place.url ? ' · from your maps link' : ''}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              onText(place.name);
              onPlace(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.placePicker}>
      <div className="row" style={{ gap: 8 }}>
        <input
          ref={inputRef}
          className={`input ${highlight ? s.fromImport : ''}`}
          id="location"
          name="location"
          value={text}
          autoComplete="off"
          placeholder="Search a park or address, or paste a Google Maps link"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            onText(e.target.value);
            setOpen(false);
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData('text');
            if (looksLikeLink(v)) {
              e.preventDefault();
              onText(v.trim());
              lookup(v.trim(), true);
            }
          }}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              onPlace(results[active]);
              setOpen(false);
            } else if (e.key === 'Escape') setOpen(false);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <button type="button" className="btn" onClick={useHere} title="Use where you are now" aria-label="Use my current location">
          <Icon name="locate" size={16} /> Here
        </button>
      </div>
      {open && results.length > 0 && (
        <ul className={s.results} id={listId} role="listbox">
          {results.map((r, i) => (
            <li
              key={`${r.lat},${r.lng}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? s.resultActive : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                onPlace(r);
                setOpen(false);
              }}
            >
              <strong>{r.name}</strong>
              <span className="small muted">{r.address}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="hint" aria-live="polite">
        {busy ? 'Looking it up…' : error ? error : open && !results.length && text.trim().length >= 3 ? 'No match on the map. It still saves as typed; volunteers get a search link.' : 'A pin gives volunteers one-tap directions.'}
      </p>
    </div>
  );
}
