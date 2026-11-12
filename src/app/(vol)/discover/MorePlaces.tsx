import Link from 'next/link';
import { connection } from 'next/server';
import { Icon } from '@/components/shell/icons';
import { requestNow } from '@/lib/format';
import { CATEGORY_LABEL, cityKey, listedOpportunities } from '@/lib/opportunities';
import s from './more-places.module.css';

// Under Discover's ranked events: a few public listings from organizations
// that mostly don't use SycaMore, and a link to the whole board. The three
// shown change once a day and are the same for everyone; nothing about the
// volunteer (their preferences, role text or saved list) is read or sent.
export async function MorePlaces() {
  await connection(); // the day's three picks are chosen per request
  const all = await listedOpportunities();
  if (!all.length) return null;
  const day = Math.floor(requestNow() / 86_400_000);
  const step = Math.max(1, Math.floor(all.length / 3));
  const picks = [0, 1, 2].map((i) => all[(day + i * step) % all.length]).filter((o, i, a) => a.indexOf(o) === i);
  return (
    <section className={s.more} aria-labelledby="more-places">
      <div className={s.head}>
        <h2 id="more-places" className={s.title}>
          More places to serve
        </h2>
        <Link href="/opportunities" className={s.all}>
          See all {all.length} <Icon name="arrow-right" size={16} />
        </Link>
      </div>
      <p className="small muted">Public listings from other organizations. SycaMore doesn’t record hours there unless they use it.</p>
      <ul className={s.list}>
        {picks.map((o) => (
          <li key={o.slug}>
            <Link href={`/opportunities/${o.slug}`} className={`card hover-lift ${s.item}`}>
              <span className={s.cat}>{CATEGORY_LABEL[o.category]}</span>
              <strong className={s.name}>{o.title}</strong>
              <span className="small muted">
                {o.org_name} · {o.remote && cityKey(o.city) === 'remote' ? 'From home' : o.city}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
