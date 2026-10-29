'use client';

import { useSyncExternalStore } from 'react';
import { PALETTES, currentPalette, setPalette, subscribePalette } from '../shell/theme';
import s from './theme-picker.module.css';

// The four nature palettes as a radio group of swatches. The choice is per
// browser and reskins the whole product, site and app alike.

export function ThemePicker({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const palette = useSyncExternalStore(subscribePalette, currentPalette, () => 'grove' as const);
  return (
    <div role="radiogroup" aria-label="Site theme" className={`${s.picker} ${compact ? s.compact : ''} ${className}`}>
      {PALETTES.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={palette === p.id}
          className={s.option}
          title={`${p.name}: ${p.note}`}
          onClick={() => setPalette(p.id)}
        >
          <span className={s.swatch} aria-hidden>
            {p.swatch.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </span>
          {!compact && <span className={s.name}>{p.name}</span>}
          {compact && <span className="sr-only">{p.name}</span>}
        </button>
      ))}
    </div>
  );
}
