import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { eventLinks, publicEvent } from '@/lib/event-public';
import { mapEmbed, osmLink } from '@/lib/place-links';
import { fmtTime, requestNow } from '@/lib/format';
import { ShareButton } from '@/components/events/ShareButton';
import s from './event-page.module.css';

// Public event page: the one link a coordinator drops in a group chat.
// What, when, where (map and one-tap directions), add to calendar, what to
// bring, and how check-in works. No sign-in; the check-in code is not shown.

const longDay = (d: Date) => new Date(d).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'long', day: 'numeric' });

export async function generateMetadata({ params }: PageProps<'/e/[slug]'>): Promise<Metadata> {
  const e = await publicEvent((await params).slug);
  if (!e) return { title: 'Event not found · SycaMore Live' };
  const when = `${longDay(e.starts_at)}, ${fmtTime(e.starts_at)} to ${fmtTime(e.ends_at)}`;
  return {
    title: `${e.title} · ${e.org_name}`,
    description: `${when}${e.place_name ?? e.location ? ` at ${e.place_name ?? e.location}` : ''}. Hosted by ${e.org_name}.`,
    openGraph: { title: e.title, description: `${when} · ${e.org_name}` },
    robots: { index: false },
  };
}

export default async function PublicEventPage({ params }: PageProps<'/e/[slug]'>) {
  await connection();
  const e = await publicEvent((await params).slug);
  if (!e) notFound();
  const l = eventLinks(e);
  const ended = new Date(e.ends_at).getTime() < requestNow();
  const live = !ended && new Date(e.starts_at).getTime() <= requestNow();
  const pin = e.place_lat != null && e.place_lng != null;

  return (
    <main className={s.page}>
      <header className={s.head}>
        <p className={s.org}>{e.org_name}</p>
        <h1 className={s.title}>{e.title}</h1>
        <p className={s.when}>
          {longDay(e.starts_at)} · {fmtTime(e.starts_at)} to {fmtTime(e.ends_at)}
        </p>
        {e.tags.length > 0 && (
          <div className="row wrap" style={{ gap: 6 }}>
            {e.tags.map((t) => (
              <span key={t.id} className={`tag tag-${t.color}`}>
                {t.name}
              </span>
            ))}
          </div>
        )}
      </header>

      {ended ? (
        <p className="notice notice-green">This event has ended. Thank you to everyone who came{e.attested_at ? '; hours are verified and on everyone’s records.' : '.'}</p>
      ) : live ? (
        <p className="notice notice-green">
          <strong>Happening now.</strong> Scan the QR code at the sign-in table when you arrive.
        </p>
      ) : null}

      {(pin || l.location) && (
        <section className={`card ${s.where}`} aria-labelledby="where">
          {pin && <iframe className={s.map} title={`Map of ${e.place_name ?? e.location}`} src={mapEmbed(e.place_lat!, e.place_lng!, 0.008)} loading="lazy" />}
          <div className={s.whereBody}>
            <h2 id="where" className={s.h2}>
              {e.place_name ?? e.location}
            </h2>
            {e.place_address && e.place_address !== e.place_name && <p className="muted">{e.place_address}</p>}
            <div className="row wrap" style={{ gap: 8 }}>
              {l.directions && (
                <a className="btn btn-primary" href={l.directions} target="_blank" rel="noopener">
                  Directions (Google Maps)
                </a>
              )}
              {l.apple && (
                <a className="btn" href={l.apple} target="_blank" rel="noopener">
                  Apple Maps
                </a>
              )}
              {pin && (
                <a className="btn btn-quiet" href={osmLink(e.place_lat!, e.place_lng!)} target="_blank" rel="noopener">
                  Larger map
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {!ended && (
        <section className={s.cal} aria-labelledby="cal">
          <h2 id="cal" className={s.h2}>
            Add it to your calendar
          </h2>
          <div className="row wrap" style={{ gap: 8 }}>
            <a className="btn" href={l.google} target="_blank" rel="noopener">
              Google Calendar
            </a>
            <a className="btn" href={l.ics}>
              Apple / iPhone
            </a>
            <a className="btn" href={l.outlook} target="_blank" rel="noopener">
              Outlook
            </a>
            <a className="btn btn-quiet" href={l.ics}>
              Download .ics
            </a>
          </div>
        </section>
      )}

      {(e.volunteer_notes || e.goal_text) && (
        <section className={s.notes} aria-labelledby="know">
          <h2 id="know" className={s.h2}>
            Good to know
          </h2>
          {e.volunteer_notes && <p className={s.noteText}>{e.volunteer_notes}</p>}
          {e.goal_text && (
            <p>
              <strong>The goal:</strong> {e.goal_text}
            </p>
          )}
        </section>
      )}

      <section className={`card ${s.hours}`} aria-labelledby="hours">
        <h2 id="hours" className={s.h2}>
          Your hours count
        </h2>
        <p>
          When you arrive, scan the QR code at the sign-in table with your phone camera, and scan out when you leave. {e.org_name} confirms the hours after the event, and you get a record anyone can check, for school, scholarships or applications.
        </p>
      </section>

      <footer className={s.foot}>
        <div className="row wrap between">
          <p className="small muted">
            Questions? {e.org_name} · <a href={`tel:${e.org_phone.replace(/[^\d+]/g, '')}`}>{e.org_phone}</a> · <a href={`mailto:${e.org_email}`}>{e.org_email}</a>
          </p>
          <ShareButton url={l.page} title={e.title} text={`${e.title} · ${longDay(e.starts_at)}, ${fmtTime(e.starts_at)}`} />
        </div>
        <p className="small muted">Hours recorded with SycaMore Live.</p>
      </footer>
    </main>
  );
}

export const instant = false;
