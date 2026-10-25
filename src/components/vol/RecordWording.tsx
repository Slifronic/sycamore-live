import { fmtHours } from '@/lib/hours';
import { ROLE_LABEL, type RecordView } from '@/lib/types';

// The record wording from the shared contract, used on /me/records/[id] and
// the public /v/<code> page. Every value comes from the attested record.

export const longDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });

export const roleWords = (role: RecordView['role']) => ROLE_LABEL[role].toLowerCase();

export function RecordWording({ r, className, fineClassName }: { r: RecordView; className?: string; fineClassName?: string }) {
  return (
    <>
      <p className={className}>
        <strong>{r.org.name}</strong> states that <strong>{r.volunteer_name}</strong> served as <strong>{roleWords(r.role)}</strong> at{' '}
        <strong>{r.event.title}</strong> on <strong>{longDate(r.event.date)}</strong>, for <strong>{fmtHours(r.hours_total)} attested hours</strong>:{' '}
        {fmtHours(r.hours_captured)} captured by check-in and check-out
        {r.hours_adjusted != null && (
          <>
            , adjusted to {fmtHours(r.hours_adjusted)} by {r.adjusted_by}: “{r.adjustment_reason?.trim()}”
          </>
        )}
        {/* A reason that already ends a sentence ("…by the team lead.") doesn't get a second period. */}
        {r.hours_adjusted != null && /[.!?]$/.test(r.adjustment_reason?.trim() ?? '') ? '' : '.'} The organization confirmed this when it closed the event.
      </p>
      <p className={fineClassName}>
        SycaMore Live recorded these hours and did not observe the work itself. Questions about this service go to {r.org.name} at {r.org.contact_phone}.
      </p>
    </>
  );
}
