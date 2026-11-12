import Link from 'next/link';
import { connection } from 'next/server';
import { CtaBand, PageHero, Section, TextLink, siteStyles as ss } from '@/components/site/Blocks';
import { pageMeta } from '@/components/site/meta';
import { Icon } from '@/components/shell/icons';
import { fmtDay, fmtTime, plural, requestNow } from '@/lib/format';
import {
  CATEGORIES, CATEGORY_LABEL, ageLabel, boardEvents, checkedLabel, cityKey, cityName, hasFilters, listedOpportunities, matches, readFilters,
  type BoardEvent, type Opportunity,
} from '@/lib/opportunities';
import s from './opportunities.module.css';

export const metadata = pageMeta(
  'Volunteer opportunities',
  'Places to volunteer around the Bay Area: upcoming events on SycaMore, where hours go on a record, and public listings that link to each organization’s own page.',
  '/opportunities',
);

// The public board: no sign-in, plain links and a GET form, so it reads and
// filters with JavaScript off. Two kinds of card that must never be confused:
// an event on SycaMore (hours are scanned and verified, so they go on a
// record) and a public listing (a link to another organization's page, where
// SycaMore records nothing).

function EventCard({ e }: { e: BoardEvent }) {
  const where = [e.place, e.org_city ? cityName(e.org_city) : null].filter(Boolean).join(' · ');
  return (
    <li className={`${s.card} ${s.onSyc}`}>
      <p className={s.kind}>
        <span className="chip chip-green">
          <Icon name="check" size={16} /> On SycaMore
        </span>
        <span className={s.cat}>{CATEGORY_LABEL[e.category]}</span>
      </p>
      <h3 className={s.title}>
        <Link href={`/e/${e.slug}`}>{e.title}</Link>
      </h3>
      <p className={s.org}>{e.org_name}</p>
      <ul className={s.meta}>
        <li>
          <Icon name="calendar" size={16} />
          <span>
            {fmtDay(e.starts_at)} · {fmtTime(e.starts_at)} to {fmtTime(e.ends_at)}
          </span>
        </li>
        {where && (
          <li>
            <Icon name="pin" size={16} />
            <span>{where}</span>
          </li>
        )}
      </ul>
      <p className={s.note}>No sign-up. Turn up and check in. {e.org_name} verifies your hours for your record.</p>
      <div className={s.actions}>
        <Link href={`/e/${e.slug}`} className="btn">
          Event page <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </li>
  );
}

function ListingCard({ o }: { o: Opportunity }) {
  return (
    <li className={s.card}>
      <p className={s.kind}>
        <span className="chip chip-ink">Public listing</span>
        <span className={s.cat}>{CATEGORY_LABEL[o.category]}</span>
      </p>
      <h3 className={s.title}>
        <Link href={`/opportunities/${o.slug}`}>{o.title}</Link>
      </h3>
      <p className={s.org}>{o.org_name}</p>
      <p className={s.summary}>{o.summary}</p>
      <ul className={s.meta}>
        <li>
          <Icon name="pin" size={16} />
          <span>{o.remote ? (cityKey(o.city) === 'remote' ? 'From home' : `From home · ${o.city}`) : o.city}</span>
        </li>
        {o.schedule && (
          <li>
            <Icon name="clock" size={16} />
            <span>{o.schedule}</span>
          </li>
        )}
        <li>
          <Icon name="user" size={16} />
          <span>{ageLabel(o.min_age)}</span>
        </li>
        {o.group_friendly && (
          <li>
            <Icon name="users" size={16} />
            <span>Groups welcome</span>
          </li>
        )}
      </ul>
      <p className={s.note}>SycaMore doesn’t record hours here unless {o.org_name} uses it.</p>
      <div className={s.actions}>
        {/* A plain link, never <Link>: a prefetch would count as a click. */}
        <a href={`/opportunities/go/${o.slug}`} className="btn" target="_blank" rel="noopener nofollow" aria-label={`Go to ${o.org_name}’s page (opens in a new tab)`}>
          Go to their page <Icon name="external" size={16} />
        </a>
        <Link href={`/opportunities/${o.slug}`} className={s.details}>
          Details
        </Link>
      </div>
      <p className={s.checked}>Link checked {checkedLabel(o.verified_on)}</p>
    </li>
  );
}

export default async function Opportunities({ searchParams }: PageProps<'/opportunities'>) {
  await connection(); // filters and "now" belong to the request
  const f = readFilters(await searchParams);
  const [allListings, allEvents] = await Promise.all([listedOpportunities(), boardEvents()]);
  // The event list is cached for a few minutes; drop anything that ended since.
  const upcoming = allEvents.filter((e) => new Date(e.ends_at).getTime() > requestNow());

  const listings = allListings.filter((o) => matches(o, f));
  // An event's minimum age isn't recorded, so the age filter keeps every event.
  const events = upcoming.filter((e) => matches({ category: e.category, city: e.org_city, remote: false, min_age: null }, f));

  // Cities to choose from: everywhere something is listed, A to Z. "Remote" is the From home box.
  const cities = new Map<string, string>();
  for (const c of [...allListings.filter((o) => cityKey(o.city) !== 'remote').map((o) => o.city), ...upcoming.flatMap((e) => (e.org_city ? [e.org_city] : []))]) {
    if (!cities.has(cityKey(c))) cities.set(cityKey(c), cityName(c));
  }
  if (f.city && !cities.has(cityKey(f.city))) cities.set(cityKey(f.city), f.city);
  const cityList = [...cities.values()].sort((a, b) => a.localeCompare(b));
  const cityValue = f.city ? cities.get(cityKey(f.city)) : '';

  const filtered = hasFilters(f);
  const total = listings.length + events.length;
  const count = [events.length ? plural(events.length, 'event') + ' on SycaMore' : null, plural(listings.length, 'public listing')].filter(Boolean).join(' · ');

  return (
    <>
      <PageHero
        eyebrow="Opportunities"
        title={['Find a place', <em key="e">to serve.</em>]}
        lede="Upcoming events on SycaMore, and public listings from organizations around the Bay Area."
        motif="seed"
      >
        <TextLink href="/discover">Have an account? See your ranked matches</TextLink>
      </PageHero>

      <section className={s.board} aria-labelledby="results-title">
        <div className={ss.wrap}>
          <form className={s.filters} method="get" action="/opportunities" role="search" aria-label="Filter opportunities">
            <div className={s.field}>
              <label htmlFor="f-category">Kind of work</label>
              <select id="f-category" name="category" className="select" defaultValue={f.category ?? ''}>
                <option value="">Any kind</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="f-city">City</label>
              <select id="f-city" name="city" className="select" defaultValue={cityValue}>
                <option value="">Any city</option>
                {cityList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${s.field} ${s.age}`}>
              <label htmlFor="f-age">Your age</label>
              <input id="f-age" name="age" className="input" type="number" inputMode="numeric" min={5} max={99} placeholder="Any" defaultValue={f.age ?? ''} />
            </div>
            <label className={s.check}>
              <input type="checkbox" name="remote" value="1" defaultChecked={f.remote} />
              <span>From home</span>
            </label>
            <div className={s.go}>
              <button type="submit" className="btn btn-primary">
                Show
              </button>
              {filtered && (
                <Link href="/opportunities" className={s.clear}>
                  Clear filters
                </Link>
              )}
            </div>
          </form>

          <h2 id="results-title" className={s.count} role="status">
            {total ? count : 'Nothing matches those filters'}
          </h2>
          {f.age !== null && total > 0 && <p className={s.hint}>Listings with no stated minimum age are kept and marked “not listed”. Check with the organization.</p>}

          {total === 0 && (
            <div className={s.empty}>
              <span className={ss.icon} aria-hidden="true">
                <Icon name="compass" size={20} />
              </span>
              <p>{filtered ? 'Try fewer filters, or another city.' : 'No opportunities are listed right now. Check back soon.'}</p>
              {filtered && (
                <Link href="/opportunities" className="btn">
                  Show everything
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {events.length > 0 && (
        <Section id="on-sycamore" eyebrow="On SycaMore" title="Hours here go on your record." lede="No sign-up. Scan in and out on the day; the organization verifies your hours.">
          <ul className={s.grid}>
            {events.map((e) => (
              <EventCard key={e.slug} e={e} />
            ))}
          </ul>
        </Section>
      )}

      {listings.length > 0 && (
        <Section
          id="listings"
          eyebrow="Public listings"
          title="More places that take volunteers."
          lede="Each one links to the organization’s own page. SycaMore doesn’t record hours there unless that organization uses it."
        >
          <ul className={s.grid}>
            {listings.map((o) => (
              <ListingCard key={o.slug} o={o} />
            ))}
          </ul>
        </Section>
      )}

      <CtaBand
        title="Run one of these?"
        text="Record these hours on SycaMore. Volunteers scan in and out; you verify."
        primary={{ href: '/org/start', label: 'Set up your organization' }}
        secondary={{ href: '/organizations', label: 'How it works for organizations' }}
        note="Free while SycaMore Live is a student demo. Nothing is charged."
      />
    </>
  );
}

// Reads the filters from the query string, so it renders per request.
export const instant = false;
