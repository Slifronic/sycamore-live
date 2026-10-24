import { fmtHours } from '@/lib/hours';
import { ROLE_LABEL, type RecordView } from '@/lib/types';
import { RecordWording, longDate } from '@/components/vol/RecordWording';
import s from './record.module.css';

// A real record, drawn the way the public /v/ page draws it: the VERIFIED
// banner, the code, the facts and the contract's wording. The demo seed's
// names are made up, and the card says so.

const pacificDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' });

export function RecordPreview({ r, compact }: { r: RecordView | null; compact?: boolean }) {
  if (!r) {
    return (
      <article className={`${s.card} ${compact ? s.compact : ''}`}>
        <p className={s.banner}>
          <strong>VERIFIED</strong>
          <span>· issued by the organization</span>
        </p>
        <p className={s.eyebrow}>Service record SYC-XXXX-XXXX</p>
        <p className={s.wording}>
          <strong>The organization</strong> states that <strong>the volunteer</strong> served at <strong>the event</strong>, for{' '}
          <strong>the attested hours</strong>, captured by check-in and check-out. The organization confirmed this when it closed the event.
        </p>
        <p className={s.fine}>The live record could not be loaded just now.</p>
      </article>
    );
  }
  return (
    <article className={`${s.card} ${compact ? s.compact : ''}`} aria-label={`Service record ${r.code ?? ''} from ${r.org.name}`}>
      <div className={s.top}>
        <p className={s.banner}>
          <strong>VERIFIED</strong>
          <span>· issued by {r.org.name}</span>
        </p>
        <span className={s.demo}>Demo · made-up names</span>
      </div>
      <div className={s.idRow}>
        <div>
          <p className={s.eyebrow}>Service record {r.code}</p>
          <p className={s.name}>{r.volunteer_name}</p>
        </div>
        <p className={s.hours}>
          <span className={s.big}>{fmtHours(r.hours_total)}</span>
          <span className={s.unit}>hours</span>
        </p>
      </div>
      <dl className={s.facts}>
        <div>
          <dt>Role</dt>
          <dd>{ROLE_LABEL[r.role]}</dd>
        </div>
        <div>
          <dt>Event</dt>
          <dd>{r.event.title}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{longDate(r.event.date)}</dd>
        </div>
      </dl>
      {!compact && <RecordWording r={r} className={s.wording} fineClassName={s.fine} />}
      {compact && (
        <p className={s.fine}>
          Confirmed {pacificDay(r.attested_at)} when the organization closed the event. Captured {fmtHours(r.hours_captured)} h by
          check-in and check-out{r.hours_adjusted == null ? '; no adjustment.' : `; adjusted with a printed reason.`}
        </p>
      )}
    </article>
  );
}
