'use client';

import { useState } from 'react';

// The sidebar ends up on the projector, so the PIN is masked until asked for.
export function PinReveal({ pin }: { pin: string }) {
  const [shown, setShown] = useState(false);
  return (
    <p className="small muted row" style={{ gap: 6 }}>
      <span>
        PIN <span className="num">{shown ? pin : `••••${pin.slice(-2)}`}</span>
      </span>
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        style={{ height: 26, padding: '0 8px', fontSize: 12 }}
        aria-pressed={shown}
        aria-label={shown ? 'Hide PIN' : 'Show PIN'}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </p>
  );
}
