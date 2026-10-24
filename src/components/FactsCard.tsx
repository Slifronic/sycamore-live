import type { OrgInsights } from '@/lib/insights';
import s from './facts-card.module.css';

// Observed facts where the Index used to be: counts straight from check-ins and
// the coordinator's sign-offs. No score, no tier, no weights.
export function FactsCard({ totals, title = 'What your events show' }: { totals: OrgInsights['totals']; title?: string }) {
  const facts = [
    { label: 'Verified hours', value: totals.verifiedHours.toLocaleString(), note: 'signed off by you' },
    { label: 'Attendances', value: totals.attendances.toLocaleString(), note: 'one per person per event' },
    { label: 'Unique volunteers', value: totals.uniqueVolunteers.toLocaleString(), note: 'with verified hours' },
    {
      label: 'Verified within 24 hours',
      value: `${totals.verifiedWithin24h} of ${totals.verifiedEvents}`,
      note: totals.verifiedEvents === 1 ? 'event, timed from its end' : 'events, timed from their end',
    },
  ];
  return (
    <section className={`card ${s.card}`}>
      <div>
        <p className="eyebrow eyebrow-sap">On the record</p>
        <h2>{title}</h2>
      </div>
      <dl className={s.grid}>
        {facts.map((f) => (
          <div key={f.label} className={s.fact}>
            <dt className={s.label}>{f.label}</dt>
            <dd className={`figure ${s.value}`}>{f.value}</dd>
            <dd className={s.note}>{f.note}</dd>
          </div>
        ))}
      </dl>
      <p className={s.foot}>Counted from check-ins and your sign-offs. These are counts, not a score or a rating.</p>
    </section>
  );
}
