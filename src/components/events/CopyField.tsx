'use client';

import { useId, useState } from 'react';

export function CopyField({ label, value }: { label: string; value: string }) {
  const id = useId();
  const [done, setDone] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row" style={{ gap: 8 }}>
        <input id={id} className="input" readOnly value={value} onFocus={(e) => e.target.select()} style={{ color: 'var(--ink-2)' }} />
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => {});
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }}
        >
          {done ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
