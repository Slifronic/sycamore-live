import { activeSession, checkinState, eventByCheckinCode, leaveCheck, normalizeCheckinCode, requireVolunteer } from '@/lib/vol-data';
import { fmtDay, fmtTime } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { CheckinForm, LiveSession } from './CheckinClient';
import s from '../pages.module.css';

export const metadata = { title: 'Check in' };

// Contract: /checkin. The org's event QR encodes /checkin?code=<checkin_code>;
// typing the 6 characters is the fallback. Signed out, /join brings them back
// here with the code. Checked in, this is the active-session screen.

export default async function CheckinPage({ searchParams }: PageProps<'/checkin'>) {
  const raw = (await searchParams).code;
  const code = typeof raw === 'string' ? normalizeCheckinCode(raw).slice(0, 6) : '';
  const vol = await requireVolunteer(code ? `/checkin?code=${code}` : '/checkin');
  const active = await activeSession(vol.id);

  if (active) {
    const leave = await leaveCheck(vol.id, active.id);
    return (
      <div className={s.narrow}>
        <PageHeader
          eyebrow={active.org.name}
          title={active.event.title}
          lede={`${fmtDay(active.event.starts_at)} · ${fmtTime(active.event.starts_at)} to ${fmtTime(active.event.ends_at)}${active.event.location ? ` · ${active.event.location}` : ''}`}
        />
        <LiveSession session={active} name={vol.name} isMinor={vol.is_minor} leave={leave} />
      </div>
    );
  }

  const event = code ? await eventByCheckinCode(code) : null;
  const state = event ? checkinState(event) : null;
  return (
    <div className={s.narrow}>
      <PageHeader
        eyebrow={event ? event.org_name : undefined}
        title={event ? event.title : 'Check in to an event'}
        lede={event ? `${fmtDay(event.starts_at)}, ${fmtTime(event.starts_at)} to ${fmtTime(event.ends_at)}${event.location ? ` · ${event.location}` : ''}` : 'The QR code is on the sign at the sign-in table.'}
      />
      {code && !event && <p className="notice notice-amber">We couldn’t find an event with the code {code}. Check it with the coordinator, or type it again below.</p>}
      {event && state !== 'open' && (
        <p className="notice notice-amber">
          {state === 'verified'
            ? `This event is over and its hours are confirmed. If you were there and aren’t on the record, contact ${event.coordinator_name}.`
            : state === 'over'
              ? `Check-in for this event has closed. Ask ${event.coordinator_name} to add you by name; your time still counts.`
              : `Check-in opens 2 hours before the event starts, at ${fmtTime(new Date(new Date(event.starts_at).getTime() - 2 * 3_600_000))} on ${fmtDay(event.starts_at)}.`}
        </p>
      )}
      <CheckinForm initialCode={event && state === 'open' ? code : ''} fromQr={!!event && state === 'open'} ready={state === 'open'} />
      <p className="small muted">Your hours come from check-in and check-out. {event ? event.coordinator_name : 'The coordinator'} confirms them.</p>
    </div>
  );
}

export const instant = false;
