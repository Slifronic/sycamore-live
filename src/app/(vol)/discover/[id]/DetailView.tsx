'use client';

import Link from 'next/link';
import { Icon } from '@/components/shell/icons';
import { evaluate } from '@/lib/discover/match';
import { useDiscover } from '../DiscoverState';
import { FitBreakdown, FitDonut, SaveButton, briefReasons, dateLine, listingCover, statusLabel } from '../parts';
import { Cover } from '@/components/media/Cover';
import { EmptyState } from '@/components/media/EmptyState';
import s from '../discover.module.css';

// One upcoming event, organization first, then what you'd do, then your fit.
// "Sign up" isn't a thing here: the event page has directions and the
// calendar, and you check in at the sign-in table on the day.
export function DetailView({ eventId }: { eventId: string }) {
  const { listings, profile, prefs } = useDiscover();
  const l = listings.find((x) => x.id === eventId);
  if (!l) {
    return (
      <div className={s.page}>
        <Link href="/discover" className={s.textlink}>
          <Icon name="chevron-left" size={16} /> All events
        </Link>
        <div className="card">
          <EmptyState
            illo="compass"
            title="This event isn’t in the list anymore."
            action={
              <Link className="btn" href="/discover">
                See upcoming events
              </Link>
            }
          >
            It may have just started or been verified. Reload to see the latest events.
          </EmptyState>
        </div>
      </div>
    );
  }
  const r = evaluate(l, profile);
  const notes = l.notes?.split(/\n\s*\n/).filter(Boolean) ?? [];

  return (
    <div className={s.page}>
      <Link href="/discover" className={s.textlink}>
        <Icon name="chevron-left" size={16} /> All events
      </Link>

      <section className="stack" style={{ gap: 10 }}>
        <Cover cover={listingCover(l)} variant="hero" preload>
          <span className={s.heroEyebrow}>Upcoming event · {l.kind}</span>
          <h1 className={s.heroTitle}>
            {l.title}
          </h1>
          <p className={s.heroSub}>
            {dateLine(l)}
            {l.place ? ` · ${l.place}` : ''}
          </p>
        </Cover>
        <div className="row wrap" style={{ gap: 6 }}>
          {l.cause && <span className={s.cause}>{l.cause}</span>}
          <span className="chip chip-ink">In person</span>
          <span className="chip chip-ink">One event</span>
          <span className="chip chip-ink">{l.day}</span>
          <span className="chip chip-ink">{l.level}</span>
        </div>
        <div className={s.mobileSave}>
          <SaveButton id={l.id} title={l.title} wide />
        </div>
      </section>

      <section className={s.orgBanner} aria-label="The organization">
        <div className="stack" style={{ gap: 4 }}>
          <span className={s.bannerLabel}>The organization</span>
          <h2 className={s.bannerName}>{l.org}</h2>
          <span className={s.bannerSub}>
            {l.orgKind === 'school' ? 'School' : 'Nonprofit'}
            {l.orgCity ? ` · ${l.orgCity}` : ''} · verifies its volunteers’ hours on SycaMore
          </span>
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <span className={s.bannerLabel}>Its goal for this event</span>
          <p>{l.goal ?? 'Not listed yet.'}</p>
        </div>
      </section>


      <div className={s.detail}>
        <section className="card card-pad stack">
          <h2>About the event</h2>
          {notes.length ? notes.map((n) => <p key={n}>{n}</p>) : <p className="muted">{l.org} hasn’t added notes for volunteers yet.</p>}
          <div className={s.skillsBlock}>
            <div className="stack" style={{ gap: 6 }}>
              <h3>Skills you’ll need</h3>
              <span className="small muted">None listed by the organization, so none are assumed.</span>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <h3>Skills you could practice</h3>
              <span className="row wrap" style={{ gap: 6 }}>
                {l.practice?.length ? l.practice.map((t) => <span key={t} className={s.skill}>{t}</span>) : <span className="small muted">Ask the organizer</span>}
              </span>
            </div>
          </div>
          <div className={s.logistics}>
            <div>
              <span className={s.bannerLabel}>When</span>
              <strong>{l.day}</strong>
              <span className="small muted">{l.time}</span>
            </div>
            <div>
              <span className={s.bannerLabel}>Where</span>
              <strong>{l.place ?? 'See the event page'}</strong>
              <span className="small muted">{l.address ?? ''}</span>
            </div>
            <div>
              <span className={s.bannerLabel}>Journey</span>
              <strong>To confirm</strong>
              <span className="small muted">Directions are on the event page</span>
            </div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <h3>Support you’ll have</h3>
            <p className="small">{l.supportNote}</p>
          </div>
          <div className={s.join}>
            <h3>How to join</h3>
            <p className="small">
              No sign-up. On the day, scan the QR at the sign-in table and check out when you leave. {l.org} confirms your hours.
            </p>
            <div className="row wrap" style={{ gap: 8 }}>
              <a className="btn btn-primary" href={`/e/${l.slug}`} target="_blank" rel="noopener">
                Event page, map and calendar ↗
              </a>
              <Link className="btn" href="/checkin">
                I’m there: check in
              </Link>
            </div>
          </div>
        </section>

        <section className={`card card-pad stack ${s.fitCard}`} aria-label="Your fit and save">
          <h2>Your fit, explained</h2>
          <div className={s.fitRow}>
            <FitDonut r={r} />
            <div className="stack" style={{ gap: 4 }}>
              <h3>{r.knownWeight < 100 ? 'Your fit so far' : 'Your fit'}</h3>
              <p className="small muted">
                {r.knownWeight < 100 ? `Supported points. Up to ${r.high} once unknown details are known.` : 'Based on your preferences.'}
              </p>
              <span className={`chip ${r.status === 'ready' ? 'chip-green' : 'chip-ink'}`} style={{ justifySelf: 'start' }}>
                {statusLabel(r)}
              </span>
            </div>
          </div>
          <ul className={s.reasons}>
            {briefReasons(r, prefs).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {r.reasons.length > 0 && <p className="notice notice-amber small">{r.reasons[0]}</p>}
          {r.status === 'conditional' && <p className="small muted">Journey time and travel cost aren’t listed, so check the map on the event page before you decide.</p>}
          <SaveButton id={l.id} title={l.title} wide />
          <p className="small muted">Saving keeps it in your list. Nothing is sent to {l.org}.</p>
          <FitBreakdown r={r} />
          <Link className={s.textlink} href="/discover">
            Explore other events →
          </Link>
        </section>
      </div>
    </div>
  );
}
