import Link from 'next/link';
import { fmtHours } from '@/lib/hours';
import type { RecordView } from '@/lib/types';
import { Icon, type IconName } from '../shell/icons';
import { Seal } from './JourneyScenes';
import type { JourneyFacts } from './journey-data';
import s from './attestation.module.css';

// The hero's proof: a real, shared record from the database (the demo seed's
// made-up names), drawn with its attestation chain: how the hours were
// captured, who confirmed them and when, and what anyone with the link sees.
// Every line comes from the record itself; nothing here is invented.

export function Attestation({ r, f }: { r: RecordView | null; f: JourneyFacts }) {
  const adjusted = r?.hours_adjusted != null;
  const chain: { icon: IconName; title: string; text: string }[] = [
    {
      icon: 'scan',
      title: 'Captured at the event',
      text: `Check-in and check-out, timed on the server: ${r ? fmtHours(r.hours_captured) : f.hours} h captured.${adjusted ? ` Adjusted to ${fmtHours(r!.hours_adjusted!)} h with a printed reason.` : ' No adjustment.'}`,
    },
    {
      icon: 'check',
      title: `Attested by ${f.org}`,
      text: `Confirmed ${f.attested}, when the organization closed the event. The rows are now read-only.`,
    },
    {
      icon: 'eye',
      title: r?.status === 'revoked' ? 'Status: revoked' : 'Status: active',
      text: 'Anyone with the link can check it, with no account. If it is ever withdrawn, the same page says REVOKED.',
    },
  ];
  return (
    <article className={s.card} aria-labelledby="sample-record">
      <div className={s.top}>
        <p className={s.banner}>
          <strong>VERIFIED</strong> · issued by {f.org}
        </p>
        <span className={s.demo}>Live sample · made-up names</span>
      </div>
      <div className={s.id}>
        <div>
          <p className={s.code}>Service record {f.code}</p>
          <h2 className={s.name} id="sample-record">
            {f.volunteer}
          </h2>
          <p className={s.event}>
            {f.role} · {f.event} · {f.dateLong}
          </p>
        </div>
        <p className={s.hours}>
          {r ? fmtHours(r.hours_total) : f.hours}
          <small>hours</small>
        </p>
      </div>
      <ol className={s.chain}>
        {chain.map((c) => (
          <li key={c.title}>
            <span className={s.dot}>
              <Icon name={c.icon} size={16} />
            </span>
            <div>
              <p className={s.cTitle}>{c.title}</p>
              <p className={s.cText}>{c.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className={s.foot}>
        <Link href={f.href} className={s.open}>
          Open the live record <Icon name="arrow-up-right" size={16} />
        </Link>
        <span className={s.contact}>Questions go to the organization: {f.phone}</span>
      </div>
      <Seal org={f.org} className={s.seal} />
    </article>
  );
}
