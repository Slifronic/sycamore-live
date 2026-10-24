import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { requireVolunteer, volunteerRecords } from '@/lib/vol-data';
import { badgeUrl, volunteerBadge } from '@/lib/vol-badges';
import { fmtHours } from '@/lib/hours';
import { plural } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { BadgeEmblem } from '@/components/vol/BadgeEmblem';
import { longDay, targetLine } from '@/components/vol/badge-format';
import { PrintButton } from '@/app/org/(app)/reports/PrintButton';
import { BadgeSharePanel } from './BadgeSharePanel';
import { LinkedInPanel } from './LinkedInPanel';
import s from '../badges.module.css';

// One badge. Signed: the certificate (issuer, signer, date, the coordinator's
// evidence note, the attested service behind it), the public verification link,
// LinkedIn wording and print. Not signed: the rule from badges.ts and how far
// the volunteer's attested hours are toward it.

export default async function BadgeDetail({ params }: PageProps<'/me/badges/[key]'>) {
  const { key } = await params;
  const vol = await requireVolunteer(`/me/badges/${key}`);
  const b = await volunteerBadge(vol.id, key);
  if (!b) notFound();
  const award = b.awards[0];

  if (!award) {
    const pct = Math.round((b.best?.progress ?? 0) * 100);
    return (
      <div className={s.page}>
        <Link href="/me/badges" className={`${s.link} no-print`}>
          ← All badges
        </Link>
        <PageHeader eyebrow={b.state === 'ready' ? 'Ready for sign-off' : 'Your next milestone'} title={b.def.name} lede={b.def.skills} />
        <div className={s.detail}>
          <section className={`card ${s.cert}`}>
            <div className={s.certHead}>
              <BadgeEmblem badge={b.def.key} state={b.state} size="lg" />
              <div className="stack" style={{ gap: 6 }}>
                <span className={`chip ${b.state === 'ready' ? 'chip-green' : 'chip-ink'}`} style={{ justifySelf: 'start' }}>
                  Not issued yet
                </span>
                <p className={s.statement}>
                  The rule: <strong>{b.def.rule}</strong>
                  {b.def.needsNote ? `, plus a note from the coordinator (${b.def.needsNote.toLowerCase()})` : ''}.
                </p>
              </div>
            </div>
            {b.best ? (
              <>
                <h3>With {b.best.org.name}</h3>
                <ul className={s.targets}>
                  {b.best.targets.map((t) => (
                    <li key={t.label}>
                      <span className={s.targetTop}>
                        <span>{t.label}</span>
                        <b>
                          {t.unit === 'hours' ? fmtHours(Math.min(t.have, t.need)) : Math.min(t.have, t.need)} / {t.need}
                        </b>
                      </span>
                      <span className="bar" aria-hidden>
                        <span style={{ width: `${Math.round(Math.min(1, t.have / t.need) * 100)}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="small muted">
                  {b.state === 'ready'
                    ? `Your attested hours meet ${b.best.org.name}’s rule. ${b.best.org.coordinator_name} reviews it and signs it off; until then it isn’t a badge.`
                    : `${pct}% of the way, counting only events ${b.best.org.name} has verified. ${targetLine(b)}.`}
                </p>
              </>
            ) : (
              <p className="small muted">None of your attested hours count toward this badge yet. Progress starts once an organization verifies an event where you served in a qualifying role or activity.</p>
            )}
            <p className={s.fine}>Progress counts each organization separately, because the organization that saw the work is the one that signs. Check-ins waiting for verification don’t count yet.</p>
          </section>
          <aside className={s.side}>
            <div className="card card-pad stack">
              <h3>One event at a time</h3>
              <p className="small muted">Ask your coordinator about taking on this kind of role at the next event. Only attested work moves this forward.</p>
              <Link href="/discover" className="btn btn-primary">
                Find an event
              </Link>
            </div>
            <Link href="/me/journey" className="card card-pad stack lift" style={{ textDecoration: 'none', gap: 6 }}>
              <h3>See the evidence</h3>
              <span className="small muted">The events, roles and hours behind your progress.</span>
            </Link>
          </aside>
        </div>
      </div>
    );
  }

  // The attested service with the issuing organization, from the records themselves.
  const records = (await volunteerRecords(vol.id)).filter((r) => r.org_id === award.org.id && r.status === 'active');
  const hours = records.reduce((n, r) => n + r.hours_total, 0);
  const url = award.code ? badgeUrl(award.code) : null;
  const qr = url ? await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } }) : null;
  const signed = longDay(award.signed_at);

  return (
    <div className={s.page}>
      <Link href="/me/badges" className={`${s.link} no-print`}>
        ← All badges
      </Link>
      <PageHeader eyebrow="Signed recognition" title={b.def.name} lede={`${award.org.name} · signed ${signed}`} className="no-print" />
      <div className={s.detail}>
        <article className={`card ${s.cert}`}>
          <div className="row between wrap">
            <span className="eyebrow">SycaMore Live · Badge certificate</span>
            <span className="chip chip-green">✓ Signed by the organization</span>
          </div>
          <div className={s.certHead}>
            <BadgeEmblem badge={b.def.key} state="signed" size="lg" />
            <div className="stack" style={{ gap: 4 }}>
              <span className="small muted">Awarded to</span>
              <p className={s.certName}>{vol.name}</p>
            </div>
          </div>
          <p className={s.statement}>
            <strong>{award.org.name}</strong> recognizes <strong>{vol.name}</strong> with the <strong>{b.def.name}</strong> badge, for {b.def.skills.toLowerCase()}. Signed by{' '}
            <strong>{award.signed_by}</strong> on <strong>{signed}</strong>.
          </p>
          {award.evidence_note ? (
            <blockquote className={s.evidence}>
              <span className="eyebrow">What the coordinator saw</span>
              <br />“{award.evidence_note}”
            </blockquote>
          ) : (
            <p className="small muted">This badge doesn’t ask for a written evidence note; the coordinator signed it from the attested record.</p>
          )}
          <dl className={s.facts}>
            <div>
              <dt>Issuer</dt>
              <dd>{award.org.name}</dd>
            </div>
            <div>
              <dt>Signed by</dt>
              <dd>
                {award.signed_by} · {signed}
              </dd>
            </div>
            <div>
              <dt>Attested service with the issuer</dt>
              <dd>
                {plural(records.length, 'event')} · {fmtHours(hours)} hours
              </dd>
            </div>
            <div>
              <dt>The rule</dt>
              <dd>{b.def.rule}</dd>
            </div>
            {award.code && (
              <div>
                <dt>Credential ID</dt>
                <dd>{award.code}</dd>
              </div>
            )}
          </dl>
          {b.awards.length > 1 && <p className="small muted">Also signed by {b.awards.slice(1).map((a) => a.org.name).join(', ')}.</p>}
          <p className={s.fine}>
            An organization-issued recognition of service it supervised, not a SycaMore assessment of skills. Questions go to {award.org.name} at {award.org.contact_phone}.
            {url ? ` Verify at ${url.replace(/^https?:\/\//, '')}` : ''}
          </p>
        </article>

        <aside className={`${s.side} no-print`}>
          <BadgeSharePanel awardId={award.id} url={url} qrSvg={qr} isMinor={vol.is_minor} />
          {!vol.is_minor && (
            <LinkedInPanel
              badgeName={b.def.name}
              skills={b.def.skills}
              orgName={award.org.name}
              signer={award.signed_by}
              signedAt={award.signed_at}
              evidence={award.evidence_note}
              url={url}
              code={award.code}
            />
          )}
          <div className="card card-pad stack">
            <h3>Keep a copy</h3>
            <p className="small muted">{url ? 'Print the certificate or save it as a PDF. The verification link is printed on it.' : 'Print the certificate or save it as a PDF.'}</p>
            <PrintButton label="Print or save certificate" />
          </div>
          <Link href="/me/journey" className="card card-pad stack lift" style={{ textDecoration: 'none', gap: 6 }}>
            <h3>See the evidence</h3>
            <span className="small muted">The events, roles and hours behind this badge.</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}

export const instant = false;
