'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../shell/icons';
import type { OrgColor } from './org-color';
import s from './folders.module.css';

// "Your organizations": each organization is a folder, and its attested
// records are the papers inside. Hover (or press and hold on a phone) lifts
// the papers a few pixels. A tap opens the folder: the three newest papers fan
// up out of it into headroom the stage always reserves, each linking to its
// record, so opening moves nothing on the page (transforms only, no height
// change). A folder with more than three records shows its two newest and a
// "more" paper that opens Journey, where every record is listed. It's a
// disclosure: the folder front is a button with aria-expanded, Escape closes
// it, and the papers are inert while it's closed. Reduced motion shows the
// open state with no movement.

export type FolderRecord = {
  id: string;
  title: string;
  month: string; // "OCT"
  day: string; // "5"
  when: string; // "Oct 5, 2026"
  role: string;
  hours: string; // "3" or "2.5"
  revoked: boolean;
  shared: boolean;
  adjusted: boolean;
};

export type Folder = {
  orgId: string;
  name: string;
  initials: string;
  color: OrgColor;
  hours: string;
  hoursLabel: string; // "12 verified hours"
  count: number;
  since: string; // "since Aug 2026"
  records: FolderRecord[];
};

const HOLD_MS = 280;

const recordLabel = (r: FolderRecord) => `${r.title}, ${r.when}, ${r.hours} ${r.hours === '1' ? 'hour' : 'hours'}${r.revoked ? ', revoked' : ''}`;

const roleLine = (r: FolderRecord) => `${r.role}${r.adjusted ? ' · adjusted' : ''}${r.revoked ? ' · revoked' : r.shared ? ' · shared' : ''}`;

export function OrgFolders({ folders }: { folders: Folder[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const hold = useRef<{ t: ReturnType<typeof setTimeout> | null; fired: boolean }>({ t: null, fired: false });
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const close = useCallback(() => {
    setOpen((id) => {
      if (id) buttons.current.get(id)?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const endHold = () => {
    if (hold.current.t) clearTimeout(hold.current.t);
    hold.current.t = null;
    if (hold.current.fired) setTimeout(() => setPeek(null), 420);
  };

  return (
    <div className={s.grid}>
      {folders.map((f) => {
        const isOpen = open === f.orgId;
        const more = f.records.length > 3 ? f.records.length - 2 : 0;
        const papers = f.records.slice(0, more ? 2 : 3);
        const regionId = `folder-${f.orgId}`;
        return (
          <div key={f.orgId} className={`${s.wrap} tag-${f.color}`} data-open={isOpen || undefined} data-peek={peek === f.orgId || undefined}>
            <div className={s.stage}>
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(f.orgId, el);
                  else buttons.current.delete(f.orgId);
                }}
                className={s.folder}
                aria-expanded={isOpen}
                aria-controls={regionId}
                onClick={() => {
                  if (hold.current.fired) {
                    hold.current.fired = false;
                    return;
                  }
                  setOpen(isOpen ? null : f.orgId);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType !== 'touch') return;
                  hold.current.fired = false;
                  hold.current.t = setTimeout(() => {
                    hold.current.fired = true;
                    setPeek(f.orgId);
                    navigator.vibrate?.(8);
                  }, HOLD_MS);
                }}
                onPointerUp={endHold}
                onPointerCancel={endHold}
                onPointerLeave={endHold}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className={s.back} aria-hidden />
                <span className={s.front}>
                  <span className={s.tile} aria-hidden>
                    {f.initials}
                  </span>
                  <span className={s.name}>{f.name}</span>
                  <span className={s.chev} aria-hidden>
                    <Icon name="chevron-down" size={16} />
                  </span>
                  <span className={s.meta}>
                    {f.count} {f.count === 1 ? 'record' : 'records'} · {f.since}
                  </span>
                  <span className={s.hours}>
                    <span aria-hidden>
                      {f.hours}
                      <span className={s.unit}>h</span>
                    </span>
                    <span className="sr-only">, {f.hoursLabel}</span>
                  </span>
                </span>
              </button>

              {/* The papers sit between the folder's back and its front. Closed,
                  they only peek out; open, they fan up and each is a link. */}
              <ul id={regionId} className={s.papers} aria-label={`Newest records from ${f.name}`} inert={!isOpen}>
                {papers.map((r, i) => (
                  <li key={r.id} className={s.paper} data-i={i}>
                    <Link href={`/me/records/${r.id}`} className={s.paperLink} aria-label={recordLabel(r)}>
                      <span className={s.paperTitle}>{r.title}</span>
                      <span className={s.paperRole}>
                        <span className={s.paperMeta}>
                          {r.month} {r.day} · {r.hours} h
                        </span>{' '}
                        · {roleLine(r)}
                      </span>
                      <span className={s.paperLines} aria-hidden />
                    </Link>
                  </li>
                ))}
                {more > 0 && (
                  <li className={`${s.paper} ${s.morePaper}`} data-i={2}>
                    <Link href="/me/journey" className={s.paperLink} aria-label={`${more} more records from ${f.name}, in Journey`}>
                      <span className={s.paperTitle}>
                        {more} more {more === 1 ? 'record' : 'records'}
                      </span>
                      <span className={s.paperRole}>
                        Every record is in Journey <Icon name="arrow-right" size={14} />
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
