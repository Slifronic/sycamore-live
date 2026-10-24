import { fmtHours } from '@/lib/hours';
import s from './hoursbar.module.css';

// Captured (from the scans) against attested (what the organization signed),
// as two small bars on one scale. They grow in once; the numbers are printed
// beside them, so the bars are decoration for the eye, not the only carrier.
export function HoursBar({ captured, attested, adjustedBy, reason }: { captured: number; attested: number; adjustedBy?: string | null; reason?: string | null }) {
  const max = Math.max(captured, attested, 0.01);
  const changed = Math.abs(captured - attested) > 0.001;
  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <span className={s.label}>Captured</span>
        <span className={s.track} aria-hidden>
          <span className={`${s.fill} ${s.captured}`} style={{ width: `${(100 * captured) / max}%` }} />
        </span>
        <span className={s.value}>{fmtHours(captured)} h</span>
      </div>
      <div className={s.row}>
        <span className={s.label}>Attested</span>
        <span className={s.track} aria-hidden>
          <span className={`${s.fill} ${s.attested}`} style={{ width: `${(100 * attested) / max}%` }} />
        </span>
        <span className={s.value}>{fmtHours(attested)} h</span>
      </div>
      <p className={s.note}>
        {changed
          ? `Adjusted from ${fmtHours(captured)} to ${fmtHours(attested)} hours${adjustedBy ? ` by ${adjustedBy}` : ''}${reason ? `: “${reason}”` : ''}.`
          : 'Captured by check-in and check-out; the coordinator made no change.'}
      </p>
    </div>
  );
}
