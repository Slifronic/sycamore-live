'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { ROLE_LABEL, type AttendanceRow, type Role } from '@/lib/types';
import { verifyEvent } from '../../../../actions';
import s from './verify.module.css';

type Row = Pick<AttendanceRow, 'id' | 'display_name' | 'method'> & {
  hours_captured: number;
  checked_in_at: string | null;
  checked_out_at: string | null;
  left_area_at: string | null; // suggested check-out from the opt-in leave-the-area check
  role: Role;
  hours: string; // what the coordinator sees in the box
  reason: string;
  no_show: boolean;
  standout: boolean;
  selected: boolean;
};

const ROLES = Object.keys(ROLE_LABEL) as Role[];
const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

export function VerifyConsole({ eventId, before, endsAt, goalText, signer, initial }: { eventId: string; before: number | null; endsAt: string; goalText: string | null; signer: string; initial: (Omit<AttendanceRow, 'left_area_at'> & { checked_in_at: string | null; checked_out_at: string | null; left_area_at: string | null })[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((a) => ({
      id: a.id,
      display_name: a.display_name,
      method: a.method,
      hours_captured: Number(a.hours_captured),
      checked_in_at: a.checked_in_at,
      checked_out_at: a.checked_out_at,
      left_area_at: a.left_area_at,
      role: a.role,
      hours: a.checked_out_at ? String(Number(a.hours_captured)) : '',
      reason: '',
      no_show: false,
      standout: false,
      selected: false,
    })),
  );
  const [goal, setGoal] = useState<'yes' | 'partly' | 'no' | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [outcome, setOutcome] = useState('');
  const [filter, setFilter] = useState('');
  const [bulkRole, setBulkRole] = useState<Role>('team_lead');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  // People who never scanned out: fill hours from their check-in to the event's end
  // (or now, if it hasn't ended), with a reason the coordinator can read and edit.
  // Someone the opt-in leave-the-area check saw leave earlier is counted until then instead.
  const missing = rows.filter((r) => !r.no_show && !r.checked_out_at && r.hours === '' && r.checked_in_at);
  const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });
  function filled(r: Row): Partial<Row> {
    const close = Math.min(Date.now(), new Date(endsAt).getTime());
    const left = r.left_area_at ? new Date(r.left_area_at).getTime() : null;
    const end = left != null && left < close ? left : close;
    const h = Math.max(0, Math.round((end - new Date(r.checked_in_at!).getTime()) / 900_000) * 0.25);
    const reason =
      end === left
        ? `Didn't scan out; their phone showed them leaving the event area around ${clock(end)}, counted until then`
        : `Didn't scan out; counted until ${clock(end)} when the event closed`;
    return { hours: String(h), reason };
  }
  function fillMissing() {
    setRows((rs) => rs.map((r) => (r.no_show || r.checked_out_at || r.hours !== '' || !r.checked_in_at ? r : { ...r, ...filled(r) })));
  }

  const set = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const changed = (r: Row) => r.hours !== '' && Number(r.hours) !== r.hours_captured;

  // Name exactly who is blocking the button, instead of a vague disabled state.
  // Each one points at the control that fixes it, so the bar can take you there.
  const blockers = useMemo(() => {
    const out: { text: string; target: string }[] = [];
    if (!goal) out.push({ text: 'Answer “did the event achieve its goal?”', target: 'goal-yes' });
    for (const r of rows) {
      if (r.no_show) continue;
      if (!r.checked_out_at && r.hours === '') out.push({ text: `${r.display_name} never checked out: enter hours with a reason, or mark no-show`, target: `hours-${r.id}` });
      else if (changed(r) && !r.reason.trim()) out.push({ text: `Add a reason for changing ${r.display_name}'s hours`, target: `reason-${r.id}` });
      else if (r.hours !== '' && (isNaN(Number(r.hours)) || Number(r.hours) < 0 || Number(r.hours) > 24)) out.push({ text: `${r.display_name}'s hours must be between 0 and 24`, target: `hours-${r.id}` });
      else if (r.hours !== '' && !Number.isInteger(Number(r.hours) * 4)) out.push({ text: `${r.display_name}'s hours go in quarter hours (like 2.25 or 2.5)`, target: `hours-${r.id}` });
    }
    return out;
  }, [rows, goal]);

  function goTo(target: string) {
    setFilter('');
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      el?.scrollIntoView({ block: 'center' });
      el?.focus({ preventScroll: true });
    });
  }

  // Flags worth a second look (not blockers): very long shifts and duplicate names.
  const dupNames = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) seen.set(r.display_name.trim().toLowerCase(), (seen.get(r.display_name.trim().toLowerCase()) ?? 0) + 1);
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
  }, [rows]);

  const present = rows.filter((r) => !r.no_show);
  const totalHours = present.reduce((s, r) => s + (r.hours === '' ? 0 : Number(r.hours) || 0), 0);
  const shown = filter ? rows.filter((r) => r.display_name.toLowerCase().includes(filter.toLowerCase())) : rows;
  const selected = rows.filter((r) => r.selected).length;

  function submit() {
    setError(null);
    start(async () => {
      const res = await verifyEvent(
        eventId,
        rows.map((r) => ({
          attendance_id: r.id,
          role: r.role,
          no_show: r.no_show,
          standout: r.standout,
          hours_adjusted: r.hours !== '' && (changed(r) || !r.checked_out_at) ? Number(r.hours) : null,
          adjustment_reason: r.reason || null,
        })),
        { goal_outcome: goal, cohort_rating: rating, outcome_text: outcome || null },
      );
      if (res.error) setError(res.error);
      // The page re-renders as the “records issued” screen; `from` is the verified hours before, so it can say how many were added.
      else router.replace(before != null ? `?from=${before}` : '?done=1', { scroll: true });
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className={`card ${s.check2}`} aria-labelledby="goal-q">
        <div className={s.goal}>
          <p className="eyebrow eyebrow-sap">Post-event check · 30 seconds</p>
          <h2 id="goal-q">Did the event achieve its goal?</h2>
          {goalText && <p className="small muted">Goal: {goalText}</p>}
          <div className="seg" role="group" aria-labelledby="goal-q" style={{ marginTop: 8 }}>
            {(['yes', 'partly', 'no'] as const).map((g) => (
              <button key={g} id={`goal-${g}`} type="button" className={`seg-item ${s.segBtn} ${goal === g ? s.segOn : ''}`} onClick={() => setGoal(g)} aria-pressed={goal === g}>
                {g === 'yes' ? 'Yes' : g === 'partly' ? 'Partly' : 'No'}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ alignSelf: 'end' }}>
          <label htmlFor="outcome" className="small">
            What got done? <span className="muted">(optional, goes on your funder report)</span>
          </label>
          <input id="outcome" className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Planted 46 trees" />
        </div>
        <fieldset className={s.rate}>
          <legend className="small" style={{ fontWeight: 700 }}>Rate the crew (optional)</legend>
          <div className="row" style={{ gap: 0 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={`${s.star} ${rating && n <= rating ? s.starLit : ''}`}>
                <input type="radio" name="rating" className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
                <span aria-hidden>★</span>
                <span className="sr-only">
                  {n} star{n > 1 ? 's' : ''}
                </span>
              </label>
            ))}
            <span className="small muted" style={{ marginLeft: 8, minWidth: 60 }}>
              {rating ? `${rating} of 5` : 'Tap a star'}
            </span>
          </div>
        </fieldset>
      </section>

      <p className="small">
        Verifying as <strong>{signer}</strong>. Your name goes on every record as the person who confirmed these hours.
      </p>

      <section className="card">
        <div className="card-head wrap">
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, no_show: false })))}>
              Everyone was here
            </button>
            {missing.length > 0 && (
              <button className="btn btn-sm btn-primary" onClick={fillMissing}>
                Fill in {missing.length} who didn’t scan out
              </button>
            )}
            <span className="row small" style={{ gap: 6 }}>
              <label htmlFor="bulk-role" className="small muted">
                Set role for selected:
              </label>
              <select id="bulk-role" className="select" style={{ height: 32, width: 170 }} value={bulkRole} onChange={(e) => setBulkRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm" disabled={!selected} onClick={() => setRows((rs) => rs.map((r) => (r.selected ? { ...r, role: bulkRole, selected: false } : r)))}>
                Apply{selected ? ` to ${selected}` : ''}
              </button>
            </span>
          </div>
          {rows.length > 10 && (
            <input className="input" style={{ height: 34, width: 220 }} placeholder="Find a name" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Find a name" />
          )}
        </div>
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table className={`t ${s.table}`}>
            <thead>
              <tr>
                <th scope="col" style={{ width: 36 }}>
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col">Volunteer</th>
                <th scope="col">Hours</th>
                <th scope="col">Role</th>
                <th scope="col">Standout</th>
                <th scope="col">
                  <span className="sr-only">Attendance</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const needsHours = !r.checked_out_at && !r.no_show;
                return (
                  <tr key={r.id} className={r.no_show ? s.dim : needsHours ? s.warn : ''}>
                    <td>
                      <input type="checkbox" checked={r.selected} onChange={(e) => set(r.id, { selected: e.target.checked })} aria-label={`Select ${r.display_name}`} />
                    </td>
                    <td>
                      <span className="row" style={{ gap: 10 }}>
                        <span className="avatar">{initials(r.display_name)}</span>
                        <span>
                          <strong className={r.no_show ? s.struck : ''}>{r.display_name}</strong>
                          {r.method === 'paper_import' && <span className="small muted"> · from paper sheet</span>}
                          {r.method === 'walk_in' && <span className="small muted"> · signed up at the door</span>}
                          {needsHours && <span className="small" style={{ color: 'var(--amber)', display: 'block' }}>No check-out recorded</span>}
                          {needsHours && r.left_area_at && r.checked_in_at && (
                            <span className="small" style={{ color: 'var(--amber)', display: 'block' }}>
                              📍 Left the area around {clock(new Date(r.left_area_at).getTime())}{' '}
                              {r.hours === '' && (
                                <button type="button" className="btn btn-sm" style={{ height: 24, marginLeft: 4 }} onClick={() => set(r.id, filled(r))}>
                                  Use as check-out
                                </button>
                              )}
                            </span>
                          )}
                          {!r.no_show && Number(r.hours) > 8 && <span className="small" style={{ color: 'var(--amber)', display: 'block' }}>Over 8 hours: double-check</span>}
                          {dupNames.has(r.display_name.trim().toLowerCase()) && <span className="small" style={{ color: 'var(--amber)', display: 'block' }}>Same name appears twice</span>}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className={s.hours}>
                        <input
                          id={`hours-${r.id}`}
                          className="input num"
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          value={r.hours}
                          placeholder="—"
                          disabled={r.no_show}
                          onChange={(e) => set(r.id, { hours: e.target.value })}
                          aria-label={`Hours for ${r.display_name}`}
                        />
                        {(changed(r) || (needsHours && r.hours !== '')) && (
                          <input
                            id={`reason-${r.id}`}
                            className="input"
                            placeholder="Why? (prints on their record)"
                            value={r.reason}
                            onChange={(e) => set(r.id, { reason: e.target.value })}
                            aria-label={`Reason for changing ${r.display_name}'s hours`}
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <select className="select" style={{ height: 36, minWidth: 170 }} value={r.role} disabled={r.no_show} onChange={(e) => set(r.id, { role: e.target.value as Role })} aria-label={`Role for ${r.display_name}`}>
                        {ROLES.map((x) => (
                          <option key={x} value={x}>
                            {ROLE_LABEL[x]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${r.standout ? s.starOn : ''}`}
                        disabled={r.no_show}
                        aria-pressed={r.standout}
                        aria-label={`Standout: ${r.display_name}`}
                        onClick={() => set(r.id, { standout: !r.standout })}
                      >
                        <span aria-hidden>{r.standout ? '★ Standout' : '☆'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${r.no_show ? s.noShowOn : 'btn-quiet'}`}
                        aria-pressed={r.no_show}
                        aria-label={`${r.display_name} was a no-show`}
                        onClick={() => set(r.id, { no_show: !r.no_show })}
                      >
                        <span aria-hidden>{r.no_show ? 'No-show ✕' : 'No-show'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className={s.bar}>
        <div>
          <p className={s.totals}>
            <span className="figure" style={{ fontSize: 28 }}>{present.length}</span>
            <span className="figure-unit">people</span>
            <span className="figure" style={{ fontSize: 28, marginLeft: 14 }}>{totalHours.toLocaleString()}</span>
            <span className="figure-unit">hours</span>
          </p>
          <p id="blockers" className="small" aria-live="polite">
            {blockers.length ? (
              <button type="button" className={s.blocker} onClick={() => goTo(blockers[0].target)}>
                {blockers[0].text}
                {blockers.length > 1 ? ` (+${blockers.length - 1} more)` : ''} →
              </button>
            ) : (
              <span style={{ color: 'var(--verified)', fontWeight: 700 }}>Ready. Records are issued the moment you verify.</span>
            )}
          </p>
          {error && (
            <p className="small" role="alert" style={{ color: 'var(--red)' }}>
              {error}
            </p>
          )}
        </div>
        <button className="btn btn-primary btn-big" disabled={blockers.length > 0 || pending} aria-describedby="blockers" onClick={submit}>
          {pending ? 'Verifying…' : '✓ Verify & close'}
        </button>
      </div>
    </div>
  );
}
