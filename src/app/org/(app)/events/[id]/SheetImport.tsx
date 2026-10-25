'use client';

import { useEffect, useRef, useState } from 'react';
import type { SheetDraft } from '@/lib/types';
import { pacificToUtc } from '@/lib/tz';
import { Icon } from '@/components/shell/icons';
import { toast } from '@/components/shell/Toast';
import s from './sheet.module.css';

type Draft = SheetDraft & { key: number; confirmed: boolean; inT: string; outT: string };

const toHHMM = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' }) : '';

// Shrink the phone photo before upload: smaller, faster, and enough to read handwriting.
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85));
}

export function SheetImport({
  eventId,
  enabled,
  eventDate,
  rosterNames,
  initialOpen = false,
}: {
  eventId: string;
  enabled: boolean;
  eventDate: string;
  rosterNames: string[];
  /** Start with the import panel open (from "+ New → Import paper sheet", ?import=1#import). */
  initialOpen?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const pick = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(initialOpen);
  const [dragging, setDragging] = useState(false);

  // Opened from the "+ New" menu: bring the panel into view and put focus on
  // "Choose a photo" (a file picker can't open without a tap, so this is one tap away).
  useEffect(() => {
    if (!initialOpen) return;
    root.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    pick.current?.focus({ preventScroll: true });
  }, [initialOpen]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDup = (d: Draft) => rosterNames.some((n) => n.trim().toLowerCase() === d.display_name.trim().toLowerCase());
  // Amber means "check this one against the photo": Claude isn't sure, the time in is missing or
  // unreadable, the name is unreadable, or the name is already on the roster. A note alone is
  // just a note.
  const needsLook = (d: Draft) => d.confidence < 0.8 || !d.inT || !d.display_name.trim() || !!d.name_unclear || isDup(d);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await shrink(f);
      setPhoto(URL.createObjectURL(blob));
      const body = new FormData();
      body.append('image', blob, 'sheet.jpg');
      const res = await fetch(`/api/org/events/${eventId}/import-sheet`, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setDrafts(
        (data.drafts as SheetDraft[]).map((d, i) => ({ ...d, key: i, confirmed: false, inT: toHHMM(d.checked_in_at), outT: toHHMM(d.checked_out_at) })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhoto(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const update = (key: number, patch: Partial<Draft>) => setDrafts((ds) => ds!.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  async function save() {
    const rows = drafts!
      .filter((d) => d.confirmed)
      .map((d) => ({
        display_name: d.display_name,
        checked_in_at: d.inT ? pacificToUtc(eventDate, d.inT).toISOString() : null,
        checked_out_at: d.outT ? pacificToUtc(eventDate, d.outT).toISOString() : null,
        confidence: d.confidence,
      }));
    setBusy(true);
    const res = await fetch(`/api/org/events/${eventId}/import-sheet/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    toast.success(`Added ${rows.length} from the paper sheet`, { body: 'They’re on the roster now. Check their hours when you verify.' });
    setDrafts(null);
    setPhoto(null);
    setOpen(false);
  }

  const confirmed = drafts?.filter((d) => d.confirmed).length ?? 0;

  const choose = () => input.current?.click();
  const disabledTitle = 'Add ANTHROPIC_API_KEY to turn this on';

  return (
    <div id="import" ref={root} className={`${s.wrap} ${open ? s.wrapOpen : ''}`}>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {!open ? (
        <button className="btn" disabled={!enabled || busy} title={enabled ? 'Photograph a paper sign-in sheet; Claude drafts the rows and you confirm each one' : disabledTitle} onClick={() => setOpen(true)}>
          <Icon name="scan" size={16} />
          Import paper sheet
        </button>
      ) : (
        <section
          className={`${s.drop} ${dragging ? s.dragging : ''}`}
          aria-labelledby="import-h"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (enabled) onFile(e.dataTransfer.files?.[0]);
          }}
        >
          <span className={s.dropIcon} aria-hidden>
            <Icon name="scan" size={20} />
          </span>
          <div className={s.dropText}>
            <h3 id="import-h">Import a paper sign-in sheet</h3>
            <p>{enabled ? 'Take a photo of the whole sheet. Claude drafts the rows; nothing is saved until you confirm each one.' : 'Sheet import is off on this server. Add people by name instead.'}</p>
          </div>
          <div className={s.dropActions}>
            <button ref={pick} className="btn btn-primary btn-sm" disabled={!enabled || busy} title={enabled ? undefined : disabledTitle} onClick={choose}>
              {busy && !drafts ? 'Reading the sheet…' : 'Choose a photo'}
            </button>
            <button className="btn btn-sm btn-quiet" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </section>
      )}
      {error && !drafts && <p className="notice notice-red small" style={{ flexBasis: '100%' }}>{error}</p>}

      {drafts && (
        <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Review the paper sheet">
          <div className={s.panel}>
            <div className={s.photo}>{photo && <img src={photo} alt="The sign-in sheet you photographed" />}</div>
            <div className={s.review}>
              <div>
                <h2>Check each row against the photo</h2>
                <p className="small muted">
                  Claude drafted these. Nothing is saved until you confirm a row. Amber rows need a closer look.
                </p>
              </div>
              {drafts.length === 0 && <p className="muted">No signed rows found. Try a straighter photo with the whole sheet in frame.</p>}
              <div className={s.rows}>
                {drafts.map((d) => {
                  const look = needsLook(d);
                  return (
                    <div key={d.key} className={`${s.row} ${look ? s.amber : ''} ${d.confirmed ? s.ok : ''}`}>
                      <div className={s.fields}>
                        <input className="input" value={d.display_name} aria-label="Name" onChange={(e) => update(d.key, { display_name: e.target.value, confirmed: false })} />
                        <input className="input" type="time" value={d.inT} aria-label="Time in" onChange={(e) => update(d.key, { inT: e.target.value, confirmed: false })} />
                        <input className="input" type="time" value={d.outT} aria-label="Time out" onChange={(e) => update(d.key, { outT: e.target.value, confirmed: false })} />
                      </div>
                      <div className="row between wrap" style={{ gap: 8 }}>
                        <span className="small muted" style={{ flex: '1 1 160px' }}>
                          {Math.round(d.confidence * 100)}% sure
                          {d.name_unclear ? ' · part of the name is hard to read' : ''}
                          {d.notes ? ` · ${d.notes}` : ''}
                          {isDup(d) ? ' · possible duplicate: already on the roster' : ''}
                          {!d.outT ? ' · no time out: hours will be 0 until you fix it at verify' : ''}
                        </span>
                        <label className={`row small ${s.looks}`}>
                          <input type="checkbox" checked={d.confirmed} disabled={!d.inT || !d.display_name.trim()} onChange={(e) => update(d.key, { confirmed: e.target.checked })} />
                          Looks right
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              {error && <p className="notice notice-red small">{error}</p>}
              <div className="row between wrap">
                <button className="btn btn-quiet" onClick={() => { setDrafts(null); setPhoto(null); }}>
                  Cancel
                </button>
                <div className="row">
                  <button
                    className="btn btn-sm"
                    onClick={() => setDrafts((ds) => ds!.map((d) => (needsLook(d) ? d : { ...d, confirmed: true })))}
                  >
                    Confirm the clear rows
                  </button>
                  <button className="btn btn-primary" disabled={!confirmed || busy} onClick={save}>
                    Add {confirmed} to roster
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
