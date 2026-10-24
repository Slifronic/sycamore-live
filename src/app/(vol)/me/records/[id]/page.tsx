import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { appUrl, requireVolunteer, volunteerRecord } from '@/lib/vol-data';
import { fmtHours } from '@/lib/hours';
import { ROLE_LABEL } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { RecordWording, longDate } from '@/components/vol/RecordWording';
import { PrintButton } from '@/app/org/(app)/reports/PrintButton';
import { SharePanel } from './SharePanel';
import s from '../../../pages.module.css';

// Contract: one record. The exact record wording, captured versus adjusted with
// the reason, and the share link (with a QR code). Minors see that sharing
// needs a guardian's OK, and the API refuses them too. Prints as a certificate.

const pacificDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

export default async function RecordPage({ params }: PageProps<'/me/records/[id]'>) {
  const { id } = await params;
  const vol = await requireVolunteer(`/me/records/${id}`);
  const r = await volunteerRecord(vol.id, id);
  if (!r) notFound();
  const url = r.code ? `${appUrl()}/v/${r.code}` : null;
  const qr = url ? await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } }) : null;
  const revoked = r.status !== 'active';

  return (
    <div className={s.page}>
      <Link href="/me" className={`${s.back} no-print`}>
        ← My hours
      </Link>
      <PageHeader eyebrow="Attested record" title={r.event.title} lede={`${r.org.name} · ${longDate(r.event.date)}`} />
      <div className={s.detail}>
        <article className={`card ${s.cert}`}>
          <div className="row between wrap">
            <span className="eyebrow">SycaMore Live · Service record</span>
            <span className={`chip ${revoked ? 'chip-red' : 'chip-green'}`}>{revoked ? 'Revoked by the organization' : '✓ Organization-attested'}</span>
          </div>
          <div className={s.certStats}>
            <div className="stack" style={{ gap: 4 }}>
              <span className="figure">
                {fmtHours(r.hours_total)}
                <span className="figure-unit">hours</span>
              </span>
              <span className="small muted">Total attested</span>
            </div>
            <div className="stack" style={{ gap: 4 }}>
              <span className="figure" style={{ fontSize: 24 }}>
                {ROLE_LABEL[r.role]}
              </span>
              <span className="small muted">Role confirmed by the coordinator</span>
            </div>
          </div>
          <RecordWording r={r} className={s.wording} fineClassName={s.fine} />
          <div className={s.split}>
            <div>
              <strong>Captured</strong>
              <p className="muted">{fmtHours(r.hours_captured)} hours, from check-in and check-out</p>
            </div>
            <div>
              <strong>Coordinator adjustment</strong>
              <p className="muted">{r.hours_adjusted == null ? 'None' : `Changed to ${fmtHours(r.hours_adjusted)} hours by ${r.adjusted_by}. Reason: “${r.adjustment_reason}”`}</p>
            </div>
          </div>
          <p className={s.fine}>
            Attested {pacificDay(r.attested_at)} · Times in Pacific time{r.code ? ` · Verify at ${appUrl().replace(/^https?:\/\//, '')}/v/${r.code}` : ''}
          </p>
        </article>

        <aside className={`${s.col} no-print`}>
          <SharePanel recordId={r.id} url={url} qrSvg={qr} isMinor={vol.is_minor} revoked={revoked} />
          <div className="card card-pad stack">
            <h3>Keep a copy</h3>
            <p className="small muted">{`Print this record or save it as a PDF for a school or scholarship file.${url && !revoked ? ' The link above is what proves it.' : ''}`}</p>
            <PrintButton label="Print or save as PDF" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export const instant = false;
