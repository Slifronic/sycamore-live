import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { fmtDay, fmtTime } from '@/lib/format';
import { googleClientId } from '@/lib/google';
import { currentVolunteerId } from '@/lib/vol-session';
import { ageOn, eventByWalkinToken, STATE_MESSAGE, walkinState } from '@/lib/walkin';
import { WalkinFlow, type WalkinAttendance } from './WalkinFlow';
import { Cover } from '@/components/media/Cover';
import { EmptyState } from '@/components/media/EmptyState';
import { coverFor } from '@/lib/covers';
import s from './walkin.module.css';

// Walk-in sign-up, the page behind an event's second QR code. Someone with no
// account signs up and is checked in to this event in one step. Someone who
// already signed up on this phone checks in with one tap, and comes back here
// to check out.

export const metadata: Metadata = { title: 'Sign up and check in', robots: { index: false, follow: false } };

export default async function WalkinPage({ params }: PageProps<'/w/[token]'>) {
  const { token } = await params;
  const found = await eventByWalkinToken(token);
  if (!found) {
    // The coordinator may have replaced the link mid-event. Someone already
    // checked in on this phone can still reach their Check out button.
    const vid = await currentVolunteerId();
    const [active] = vid
      ? ((await sql`
          select a.id, a.status, a.checked_in_at, a.checked_out_at, v.name, v.date_of_birth,
                 e.title, e.starts_at, e.ends_at, e.location, o.name as org_name, o.coordinator_name
          from attendance a join volunteer v on v.id = a.volunteer_id join event e on e.id = a.event_id join org o on o.id = e.org_id
          where a.volunteer_id = ${vid} and a.status = 'checked_in' and e.attested_at is null
          order by a.checked_in_at desc limit 1`) as unknown as (WalkinAttendance & {
          name: string; date_of_birth: Date; title: string; starts_at: Date; ends_at: Date; location: string | null; org_name: string; coordinator_name: string;
        })[])
      : [];
    if (active) {
      return (
        <main className={s.page}>
          <header className={s.head}>
            <Cover cover={coverFor({ title: active.title })} variant="band" priority className={s.hero}>
              <p className={s.org}>{active.org_name}</p>
              <h1 className={s.title}>
                {active.title}
              </h1>
            </Cover>
            <p className={s.lede}>
              {fmtDay(active.starts_at)} · {fmtTime(active.starts_at)} to {fmtTime(active.ends_at)}
              {active.location ? ` · ${active.location}` : ''}
            </p>
          </header>
          <WalkinFlow
            token={token}
            open={false}
            closedMessage=""
            orgName={active.org_name}
            coordinator={active.coordinator_name}
            googleClientId={null}
            returning={{ name: active.name, is_minor: ageOn(new Date(active.date_of_birth)) < 18 }}
            attendance={{ id: active.id, status: active.status, checked_in_at: JSON.parse(JSON.stringify(active.checked_in_at)), checked_out_at: null }}
          />
        </main>
      );
    }
    return (
      <main className={s.page}>
        <section className={s.card}>
          <EmptyState compact illo="compass" title={<span className={s.badTitle}>This sign-up link doesn’t work</span>}>
            It may have been replaced with a new one. Ask the coordinator at the sign-in table for the current QR code, or to add you by name. Your time still counts.
          </EmptyState>
        </section>
      </main>
    );
  }
  const { event, org } = found;
  const state = walkinState(event);

  // Already known on this phone? (the contract's `vid` cookie)
  const vid = await currentVolunteerId();
  const [vol] = vid
    ? ((await sql`select id, name, date_of_birth from volunteer where id = ${vid}`) as unknown as { id: string; name: string; date_of_birth: Date }[])
    : [];
  const [att] = vol
    ? ((await sql`
        select id, status, checked_in_at, checked_out_at from attendance
        where event_id = ${event.id} and volunteer_id = ${vol.id}`) as unknown as WalkinAttendance[])
    : [];

  return (
    <main className={s.page}>
      <header className={s.head}>
        <Cover cover={coverFor(event)} variant="band" priority className={s.hero}>
          <p className={s.org}>{org.name}</p>
          <h1 className={s.title}>
            {event.title}
          </h1>
        </Cover>
        <p className={s.lede}>
          {fmtDay(event.starts_at)} · {fmtTime(event.starts_at)} to {fmtTime(event.ends_at)}
          {event.location ? ` · ${event.location}` : ''}
        </p>
      </header>
      <WalkinFlow
        token={token}
        open={state === 'open'}
        closedMessage={state === 'open' ? '' : STATE_MESSAGE[state](org.coordinator_name)}
        orgName={org.name}
        coordinator={org.coordinator_name}
        googleClientId={googleClientId()}
        returning={vol ? { name: vol.name, is_minor: ageOn(new Date(vol.date_of_birth)) < 18 } : null}
        attendance={att ? JSON.parse(JSON.stringify(att)) : null}
      />
      <p className={s.foot}>
        SycaMore Live records your hours for {org.name}. {org.coordinator_name} confirms them when the event closes, and you get a record anyone can check.
      </p>
    </main>
  );
}

export const instant = false;
