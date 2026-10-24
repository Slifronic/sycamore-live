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
  role: Role;
  hours: string; // what the coordinator sees in the box
  reason: string;
  no_show: boolean;
  standout: boolean;
  selected: boolean;
};

const ROLES = Object.keys(ROLE_LABEL) as Role[];
const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

export function VerifyConsole({ eventId, endsAt, goalText, signer, initial }: { eventId: string; endsAt: string; goalText: string | null; signer: string; initial: (AttendanceRow & { checked_in_at: string | null; checked_out_at: string | null })[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((a) => ({
      id: a.id,
      display_name: a.display_name,
      method: a.method,
      hours_captured: Number(a.hours_captured),
      checked_in_at: a.checked_in_at,
      checked_out_at: a.checked_out_at,
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
  const missing = rows.filter((r) => !r.no_show && !r.checked_out_at && r.hours === '' && r.checked_in_at);
  function fillMissing() {
    const end = Math.min(Date.now(), new Date(endsAt).getTime());
    const label = new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setRows((rs) =>
      rs.map((r) => {
        if (r.no_show || r.checked_out_at || r.hours !== '' || !r.checked_in_at) return r;
        const h = Math.max(0, Math.round((end - new Date(r.checked_in_at).getTime()) / 900_000) * 0.25);
        return { ...r, hours: String(h), reason: `Didn't scan out; counted until ${label} when the event closed` };
      }),
    );
  }

  const set = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const changed = (r: Row) => r.hours !== '' && Number(r.hours) !== r.hours_captured;

  // Name exactly who is blocking the button, instead of a vague disabled state.
  const blockers = useMemo(() => {
    const out: string[] = [];
    for (const r of rows) {
      if (r.no_show) continue;
      if (!r.checked_out_at && r.hours === '') out.push(`${r.display_name} never checked out: enter hours with a reason, or mark no-show`);
      else if (changed(r) && !r.reason.trim()) out.push(`Add a reason for changing ${r.display_name}'s hours`);
      else if (r.hours !== '' && (isNaN(Number(r.hours)) || Number(r.hours) < 0 || Number(r.hours) > 24)) out.push(`${r.display_name}'s hours must be between 0 and 24`);
    }
    if (!goal) out.push('Answer “did the event achieve its goal?”');
    return out;
  }, [rows, goal]);

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
      else router.refresh(); // the page re-renders as the “records issued” screen
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
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
              <select className="select" style={{ height: 32, width: 170 }} value={bulkRole} onChange={(e) => setBulkRole(e.target.value as Role)} aria-label="Role for selected">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm" disabled={!selected} onClick={() => setRows((rs) => rs.map((r) => (r.selected ? { ...r, role: bulkRole, selected: false } : r)))}>
                Set for {selected || ''} selected
              </button>
            </span>
          </div>
          {rows.length > 10 && (
            <input className="input" style={{ height: 34, width: 220 }} placeholder="Find a name" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Find a name" />
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={`t ${s.table}`}>
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>Volunteer</th>
                <th>Hours</th>
                <th>Role</th>
                <th>Standout</th>
                <th>No-show</th>
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
                          <strong>{r.display_name}</strong>
                          {r.method === 'paper_import' && <span className="small muted"> · from paper sheet</span>}
                          {needsHours && <span className="small" style={{ color: 'var(--amber)', display: 'block' }}>No check-out recorded</span>}
                          {!r.no_show && Number(r.hours) > 8 && <span className="small" style={{ color: 'var(--amber)', display: 'block' }}>Over 8 hours: double-check</span>}
                          {dupNames.has(r.display_name.trim().toLowerCase()) && <span className="small" style={{ color: 'var(--amber)', display: 'block' }}>Same name appears twice</span>}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className={s.hours}>
                        <input
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
                        onClick={() => set(r.id, { standout: !r.standout })}
                      >
                        {r.standout ? '★ Standout' : '☆'}
                      </button>
                    </td>
                    <td>
                      <input type="checkbox" checked={r.no_show} onChange={(e) => set(r.id, { no_show: e.target.checked })} aria-label={`${r.display_name} was a no-show`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`card card-pad ${s.check2}`}>
        <div>
          <p className={s.eyebrow}>Post-event check · 30 seconds</p>
          <h2>Did the event achieve its goal?</h2>
          {goalText && <p className="small muted">Goal: {goalText}</p>}
          <div className="row" style={{ marginTop: 10 }}>
            {(['yes', 'partly', 'no'] as const).map((g) => (
              <button key={g} className={`btn ${goal === g ? 'btn-primary' : ''}`} onClick={() => setGoal(g)} aria-pressed={goal === g}>
                {g === 'yes' ? 'Yes' : g === 'partly' ? 'Partly' : 'No'}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 14, maxWidth: 360 }}>
            <label htmlFor="outcome" className="small">
              What got done? <span className="muted">(optional, goes on your funder report)</span>
            </label>
            <input id="outcome" className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Planted 46 trees" />
          </div>
        </div>
        <div>
          <h3>Rate the crew (optional)</h3>
          <div className="row" style={{ marginTop: 6, gap: 0 }} role="radiogroup" aria-label="Rate the crew">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                className={`${s.star} ${rating && n <= rating ? s.starLit : ''}`}
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
            <span className="small muted" style={{ marginLeft: 8, minWidth: 60 }}>
              {rating ? `${rating} of 5` : 'Tap a star'}
            </span>
          </div>
        </div>
      </section>

      <div className={s.bar}>
        <div>
          <strong>
            {present.length} people · {totalHours.toLocaleString()} hours
          </strong>
          <p className="small muted">{blockers.length ? blockers[0] + (blockers.length > 1 ? ` (+${blockers.length - 1} more)` : '') : 'Ready. Records are issued the moment you verify.'}</p>
          {error && <p className="small" style={{ color: 'var(--red)' }}>{error}</p>}
          <p className="small" style={{ marginTop: 4 }}>
            Verifying as <strong>{signer}</strong>. Your name goes on every record as the person who confirmed these hours.
          </p>
        </div>
        <button className="btn btn-primary btn-big" disabled={blockers.length > 0 || pending} onClick={submit}>
          {pending ? 'Verifying…' : '✓ Verify & close'}
        </button>
      </div>
    </div>
  );
}
