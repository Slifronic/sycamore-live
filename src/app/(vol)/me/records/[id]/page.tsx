import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { appUrl, guardianApproved, requireVolunteer, volunteerRecord } from '@/lib/vol-data';
import { fmtHours } from '@/lib/hours';
import { ROLE_LABEL } from '@/lib/types';
import { RecordWording, longDate } from '@/components/vol/RecordWording';
import { HoursBar } from '@/components/media/HoursBar';
import { Leaf } from '@/components/media/Leaf';
import { Icon } from '@/components/shell/icons';
import { orgInitials } from '@/components/vol/org-color';
import { RecordActions } from './RecordActions';
import s from './record.module.css';
import { recordMeta } from '@/lib/page-meta';

export async function generateMetadata({ params }: PageProps<'/me/records/[id]'>) {
  return recordMeta((await params).id);
}

// One record, as a certificate: the exact record wording, captured versus
// adjusted when the coordinator changed it, then two actions: Share (link, QR,
// copy) and Use this record (a resume line or scholarship sentence). For
// minors Share is locked (secondary, with the reason under it) and opens the
// honest next step: an hour letter from the coordinator, or a printed copy.
// The API refuses minors too. Prints as a
// certificate; the certificate stays paper-coloured in the dark theme.

const pacificDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

export default async function RecordPage({ params }: PageProps<'/me/records/[id]'>) {
  const { id } = await params;
  const vol = await requireVolunteer(`/me/records/${id}`);
  const r = await volunteerRecord(vol.id, id);
  if (!r) notFound();
  const url = r.code ? `${appUrl()}/v/${r.code}` : null;
  const qr = url ? await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } }) : null;
  const revoked = r.status !== 'active';
  const adjusted = r.hours_adjusted != null;

  return (
    <div className={s.page}>
      <Link href="/me" className={`${s.back} no-print`}>
        <Icon name="chevron-left" size={16} /> Home
      </Link>

      <article className={`${s.cert} force-light`} aria-labelledby="cert-title">
        <header className={s.certHead}>
          <span className={s.brand}>
            <Leaf size={16} color="var(--canopy)" /> SycaMore Live · Service record
          </span>
          <span className={`chip ${revoked ? 'chip-red' : 'chip-green'}`}>
            {revoked ? (
              'Revoked by the organization'
            ) : (
              <>
                <Icon name="check" size={14} /> Organization-attested
              </>
            )}
          </span>
        </header>

        <div className={s.lead}>
          <p className={s.hours}>
            {fmtHours(r.hours_total)}
            <span>{r.hours_total === 1 ? 'hour' : 'hours'}</span>
          </p>
          <div className={s.titles}>
            <h1 id="cert-title" className={s.title}>
              {r.event.title}
            </h1>
            <p className={s.sub}>
              {ROLE_LABEL[r.role]} · {longDate(r.event.date)}
            </p>
          </div>
        </div>

        <RecordWording r={r} className={s.wording} fineClassName={s.fine} />
        {adjusted && <HoursBar captured={r.hours_captured} attested={r.hours_total} adjustedBy={r.adjusted_by} reason={r.adjustment_reason} />}

        <footer className={s.certFoot}>
          <span className={s.orgTile} aria-hidden>
            {orgInitials(r.org.name)}
          </span>
          <span className={s.orgText}>
            <b>{r.org.name}</b>
            <span>
              Attested {pacificDay(r.attested_at)}
              {r.code ? ` · Verify at ${appUrl().replace(/^https?:\/\//, '')}/v/${r.code}` : ''}
            </span>
          </span>
        </footer>
      </article>

      <RecordActions recordId={r.id} url={url} qrSvg={qr} isMinor={vol.is_minor && !(await guardianApproved(vol.id))} revoked={revoked} orgName={r.org.name} orgPhone={r.org.contact_phone} />
    </div>
  );
}

export const instant = false;
