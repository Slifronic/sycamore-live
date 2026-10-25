'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Popover } from '@/components/ui/Popover';
import { Icon } from '@/components/shell/icons';
import s from './messages.module.css';

type Person = { id: string; name: string; hours: number };

const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/**
 * "New message": one button that opens a volunteer picker (type to filter,
 * then pick). Lists only people this org may write to directly who don't have
 * a thread yet; under-18s are left out (announcements only).
 */
export function NewMessage({ people }: { people: Person[] }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (k ? people.filter((p) => p.name.toLowerCase().includes(k)) : people).slice(0, 50);
  }, [people, q]);

  return (
    <Popover
      label="New message to"
      placement="bottom-end"
      panelClassName={s.pickPanel}
      trigger={(p) => (
        <button {...p} type="button" className={`btn ${s.newBtn}`} disabled={people.length === 0} title={people.length === 0 ? 'Everyone you can write to already has a thread' : undefined}>
          <Icon name="plus" size={16} /> New message
        </button>
      )}
    >
      {(close) => (
        <div className={s.pick}>
          <label className={s.pickSearch}>
            <Icon name="search" size={16} />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a volunteer" aria-label="Find a volunteer" autoFocus />
          </label>
          <ul className={s.pickList} aria-label="Volunteers">
            {shown.map((p) => (
              <li key={p.id}>
                <Link href={`/org/messages?v=${p.id}`} className={s.pickItem} scroll={false} onClick={() => close()}>
                  <span className={`avatar ${s.pickAvatar}`}>{initials(p.name)}</span>
                  <span className={s.pickName}>{p.name}</span>
                  <span className={s.pickMeta}>{p.hours} hrs</span>
                </Link>
              </li>
            ))}
            {shown.length === 0 && <li className={s.pickEmpty}>No one by that name.</li>}
          </ul>
        </div>
      )}
    </Popover>
  );
}
