import { requireVolunteer, appUrl } from '@/lib/vol-data';
import { sql } from '@/lib/db';
import { buildTranscript, hourRequests, shareState } from '@/lib/transcript';
import { fmtHours } from '@/lib/hours';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { TranscriptView } from '@/components/vol/TranscriptView';
import { GuardianForm, HourRequestForm, PublishControls, ResendButton } from './TranscriptForms';
import s from './page.module.css';

export const metadata = {
  title: 'Transcript',
  description: 'Every confirmed hour across every organization, on one link a school or scholarship committee can check.',
};

const day = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default async function TranscriptPage() {
  const vol = await requireVolunteer('/me/transcript');
  const [t, share, requests, [row]] = await Promise.all([
    buildTranscript(vol.id, vol.name),
    shareState(vol.id),
    hourRequests(vol.id),
    sql`select transcript_code, transcript_shared_at from volunteer where id = ${vol.id}` as unknown as Promise<{ transcript_code: string | null; transcript_shared_at: Date | null }[]>,
  ]);
  const url = row?.transcript_code ? `${appUrl()}/t/${row.transcript_code}` : null;
  const shared = row?.transcript_shared_at ? new Date(row.transcript_shared_at) : null;
  const linkedIn =
    url && shared
      ? `https://www.linkedin.com/profile/add?${new URLSearchParams({
          startTask: 'CERTIFICATION_NAME',
          name: 'Volunteer service transcript',
          organizationName: 'SycaMore',
          issueYear: String(shared.getFullYear()),
          issueMonth: String(shared.getMonth() + 1),
          certUrl: url,
          certId: row!.transcript_code!,
        })}`
      : null;

  return (
    <div className={`page ${s.page}`}>
      <PageHeader
        eyebrow="Your service"
        title="Transcript"
        lede="Every confirmed hour, across every organization, on one link a school or scholarship committee can check."
      />

      <Card as="section" pad className={s.card} aria-labelledby="share">
        <h2 id="share">Share it</h2>
        {share.allowed ? (
          <>
            <p className="muted">The link shows your name, organizations, dates, roles and hours. Never your email, birth date or messages.</p>
            <PublishControls url={url} linkedIn={linkedIn} />
          </>
        ) : (
          <div id="guardian" className="stack">
            <p className="muted">
              You’re under 18, so a parent or guardian approves before anything is shared. Your hours keep counting either way, and you can print this page
              any time.
            </p>
            <GuardianForm email={share.guardian_email} pending={share.guardian_pending} />
          </div>
        )}
      </Card>

      <Card as="section" pad className={s.card} aria-label="Your transcript">
        <TranscriptView t={t} />
      </Card>

      <Card as="section" pad className={s.card} aria-labelledby="elsewhere">
        <h2 id="elsewhere">Hours from somewhere else</h2>
        <p className="muted">
          Volunteered with an organization that isn’t on SycaMore? Send the details to your supervisor there. They confirm, correct or decline from an
          email link, no account needed, and confirmed hours join your transcript marked “confirmed by email”.
        </p>
        {requests.length > 0 && (
          <ul className={s.requests}>
            {requests.map((r) => (
              <li key={r.id} className={s.request}>
                <span className={s.reqMain}>
                  <strong>
                    {r.org_name} · {day(r.served_on)} · {fmtHours(r.status === 'confirmed' && r.confirmed_hours ? Number(r.confirmed_hours) : Number(r.hours))} h
                  </strong>
                  <span className="muted small">
                    {r.status === 'confirmed'
                      ? `Confirmed by ${r.confirmer_name}${r.confirmed_hours && Number(r.confirmed_hours) !== Number(r.hours) ? ` (you asked for ${fmtHours(Number(r.hours))} h)` : ''}`
                      : r.status === 'declined'
                        ? `Declined by ${r.confirmer_name}${r.decline_reason ? `: “${r.decline_reason}”` : ''}`
                        : r.expired
                          ? `Expired. ${r.contact_name} didn’t answer in 30 days.`
                          : `Waiting for ${r.contact_name} (${r.contact_email})`}
                  </span>
                </span>
                <span className={s.reqEnd}>
                  <span className={`chip ${r.status === 'confirmed' ? 'chip-green' : r.status === 'declined' ? 'chip-red' : 'chip-amber'}`}>
                    {r.status === 'pending' ? (r.expired ? 'Expired' : 'Waiting') : r.status === 'confirmed' ? 'Confirmed' : 'Declined'}
                  </span>
                  {r.can_resend && <ResendButton id={r.id} />}
                </span>
              </li>
            ))}
          </ul>
        )}
        <details className={s.more} open={requests.length === 0}>
          <summary>Ask a supervisor to confirm hours</summary>
          <HourRequestForm />
        </details>
      </Card>
    </div>
  );
}

// Reads the session cookie or a token from the URL, so it renders per request.
export const instant = false;
