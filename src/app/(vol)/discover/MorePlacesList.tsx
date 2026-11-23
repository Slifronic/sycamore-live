'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Icon } from '@/components/shell/icons';
import { matchListings, matchReason } from '@/lib/discover/listing-match';
import { useDiscover } from './DiscoverState';
import s from './more-places.module.css';

export type PlaceCard = { slug: string; title: string; org_name: string; where: string; category: string; skills: string[] };

// The cards under "More places to serve". With skills in the Discover
// profile (to learn, to use, or from past roles), the three listings that
// share the most come first, matched here in the browser: the profile never
// leaves the page. Without any, the day's three picks the server chose.
export function MorePlacesList({ all, picks, total }: { all: PlaceCard[]; picks: string[]; total: number }) {
  const { prefs, roles } = useDiscover();
  const matches = useMemo(
    () => matchListings(all, { learn: prefs.learnSkills, use: prefs.useSkills, past: roles.flatMap((r) => r.skills) }),
    [all, prefs.learnSkills, prefs.useSkills, roles],
  );
  const shown = matches.length ? matches.map((m) => ({ card: m.listing, why: matchReason(m) })) : picks.flatMap((slug) => all.filter((c) => c.slug === slug).map((card) => ({ card, why: null })));

  return (
    <section className={s.more} aria-labelledby="more-places">
      <div className={s.head}>
        <h2 id="more-places" className={s.title}>
          {!matches.length ? 'More places to serve' : matches.some((m) => m.learn.length) ? 'Places that build your skills' : 'Places that use your skills'}
        </h2>
        <Link href="/opportunities" className={s.all}>
          See all {total} <Icon name="arrow-right" size={16} />
        </Link>
      </div>
      <p className="small muted">
        Public listings from other organizations. SycaMore doesn’t record hours there unless they use it.
        {matches.length ? ' Matched in your browser from the skills in your Discover profile.' : ''}
      </p>
      <ul className={s.list}>
        {shown.map(({ card, why }) => (
          <li key={card.slug}>
            <Link href={`/opportunities/${card.slug}`} className={`card hover-lift ${s.item}`}>
              <span className={s.cat}>{card.category}</span>
              <strong className={s.name}>{card.title}</strong>
              <span className="small muted">
                {card.org_name} · {card.where}
              </span>
              {why && <span className={s.why}>{why}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
