'use client';

import { useId, useMemo, useState } from 'react';
import s from './events.module.css';

export type TagOption = { name: string; color: string };

// Labels for an event: pick the org's existing tags or type a new one and
// press Enter. New tags get the next colour when the event is saved.
export function TagInput({ value, onChange, options, highlight }: { value: string[]; onChange: (v: string[]) => void; options: TagOption[]; highlight?: boolean }) {
  const [draft, setDraft] = useState('');
  const id = useId();
  const colorOf = useMemo(() => new Map(options.map((o) => [o.name.toLowerCase(), o.color])), [options]);
  const has = (n: string) => value.some((v) => v.toLowerCase() === n.toLowerCase());
  const add = (raw: string) => {
    const n = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32);
    if (n && !has(n) && value.length < 8) onChange([...value, options.find((o) => o.name.toLowerCase() === n.toLowerCase())?.name ?? n]);
    setDraft('');
  };
  const q = draft.trim().toLowerCase();
  const suggestions = options.filter((o) => !has(o.name) && (!q || o.name.toLowerCase().includes(q))).slice(0, 8);
  const isNew = q && !options.some((o) => o.name.toLowerCase() === q);

  return (
    <div className={`${s.tagBox} ${highlight ? s.fromImport : ''}`}>
      <div className={s.tagRow} onClick={() => document.getElementById(id)?.focus()}>
        {value.map((t) => (
          <span key={t} className={`tag tag-${colorOf.get(t.toLowerCase()) ?? 'stone'}`}>
            {t}
            <button type="button" className={s.tagX} aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))}>
              ×
            </button>
            <input type="hidden" name="tags" value={t} />
          </span>
        ))}
        <input
          id={id}
          className={s.tagInput}
          value={draft}
          placeholder={value.length ? 'Add another' : 'e.g. Weekend, Youth-friendly'}
          aria-label="Add a tag"
          onChange={(e) => {
            if (e.target.value.endsWith(',')) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Enter takes the first matching tag, so "plant" picks "Planting"; "+ Create" makes a new one.
              if (draft.trim()) add(isNew && suggestions.length ? suggestions[0].name : draft);
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
      {(suggestions.length > 0 || isNew) && (
        <div className={s.tagSuggest} aria-label="Tag suggestions">
          {suggestions.map((o) => (
            <button key={o.name} type="button" className={`tag tag-${o.color} ${s.tagPick}`} onMouseDown={(e) => e.preventDefault()} onClick={() => add(o.name)}>
              {o.name}
            </button>
          ))}
          {isNew && (
            <button type="button" className={`tag tag-stone ${s.tagPick}`} onMouseDown={(e) => e.preventDefault()} onClick={() => add(draft)}>
              + Create “{draft.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
